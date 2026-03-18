"""
pemograman-kripto — app.py  v4.1
FastAPI + asyncio + asyncpg  |  PostgreSQL
─────────────────────────────────────────────────
ETL      : tiap 1 menit dari Indodax
           ts          = TIMESTAMP dibulatkan ke menit (dedup)
           server_time = BIGINT Unix timestamp dari Indodax
                         e.g. 1773560623 → 2026-03-15 14:43:43 WIB
Indikator: RSI(14) + BB(20,2) dihitung di Python (library ta)
           JS hanya render — tidak menghitung apapun.
Signal   : gabungan RSI + BB
DB owner : farisalfatih
"""

import os
import asyncio
import logging
import sys
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import asyncpg
import httpx
import pandas as pd
from ta.momentum   import RSIIndicator
from ta.volatility import BollingerBands

from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# ─── .env ─────────────────────────────────────────────────────────────────────
load_dotenv()

DB_DSN = (
    f"postgresql://{os.getenv('DB_USER','farisalfatih')}"
    f":{os.getenv('DB_PASS','')}"
    f"@{os.getenv('DB_HOST','localhost')}"
    f":{os.getenv('DB_PORT','5432')}"
    f"/{os.getenv('DB_NAME','pemograman_kripto')}"
)

ETL_ENABLED        = os.getenv("ETL_ENABLED",        "true").lower() == "true"
ETL_DEBUG_MODE     = os.getenv("ETL_DEBUG_MODE",     "false").lower() == "true"
ETL_DEBUG_INTERVAL = int(os.getenv("ETL_DEBUG_INTERVAL", "60"))

INDODAX_URL  = "https://indodax.com/api/tickers"
ASSETS       = ["btc_idr", "eth_idr", "ada_idr", "bnb_idr", "usdt_idr"]

# 1 menit = 1440 baris/hari
ROWS_PER_DAY = 1440
DEFAULT_DAYS = 14
MAX_DAYS     = 30
WARMUP_ROWS  = 25      # RSI(14) + BB(20) butuh minimal 20 baris warmup

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s - %(name)s - %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger  = logging.getLogger("api")
etl_log = logging.getLogger("etl")

_NOISE_PATHS = {
    "/admin", "/wp-admin", "/wp-login.php", "/phpmyadmin",
    "/signup", "/register", "/.env", "/.git",
    "/robots.txt", "/sitemap.xml",
}
class _NoiseFilter(logging.Filter):
    def filter(self, record):
        msg = record.getMessage()
        if "404" in msg or "400" in msg:
            for p in _NOISE_PATHS:
                if p in msg:
                    return False
        return True
logging.getLogger("uvicorn.access").addFilter(_NoiseFilter())

# ─── ETL status ───────────────────────────────────────────────────────────────
etl_status: Dict[str, Any] = {
    "running":      False,
    "last_run":     None,
    "next_run":     None,
    "last_error":   None,
    "total_saved":  0,
    "interval_sec": 60,
}

db_pool: Optional[asyncpg.Pool] = None


# ══════════════════════════════════════════════════════════════════════════════
#  INDIKATOR — RSI(14) + BB(20,2) via library `ta`
# ══════════════════════════════════════════════════════════════════════════════

def compute_indicators(rows: list) -> list:
    """
    Input : list dict, tiap dict wajib punya key 'last' (close price).
    Output: list dict yang sama + kolom tambahan:
              rsi, bb_upper, bb_middle, bb_lower, signal
    Nilai None saat warmup belum cukup (normal untuk baris-baris awal).
    """
    if not rows:
        return rows

    closes = pd.Series([float(r["last"]) for r in rows])

    # RSI(14)
    rsi_vals = RSIIndicator(close=closes, window=14).rsi()

    # Bollinger Bands(20, ±2σ)
    bb       = BollingerBands(close=closes, window=20, window_dev=2)
    bb_upper = bb.bollinger_hband()
    bb_mid   = bb.bollinger_mavg()
    bb_lower = bb.bollinger_lband()

    result = []
    for i, r in enumerate(rows):
        rec = dict(r)

        def _f(series, idx=i):
            v = series.iloc[idx]
            return round(float(v), 8) if pd.notna(v) else None

        rec["rsi"]       = _f(rsi_vals)
        rec["bb_upper"]  = _f(bb_upper)
        rec["bb_middle"] = _f(bb_mid)
        rec["bb_lower"]  = _f(bb_lower)
        rec["signal"]    = _make_signal(
            price    = rec["last"],
            rsi      = rec["rsi"],
            bb_upper = rec["bb_upper"],
            bb_lower = rec["bb_lower"],
        )
        result.append(rec)

    return result


def _make_signal(price, rsi, bb_upper, bb_lower) -> str:
    """
    Sinyal gabungan RSI + Bollinger Bands:
    STRONG BUY  : RSI < 30  dan  price <= BB Lower
    BUY         : RSI < 40  dan  price <  BB Lower
    WEAK BUY    : RSI < 50
    STRONG SELL : RSI > 70  dan  price >= BB Upper
    SELL        : RSI > 60  dan  price >  BB Upper
    WEAK SELL   : RSI > 50
    NEUTRAL     : kondisi lain / warmup belum cukup
    """
    if rsi is None or bb_upper is None or bb_lower is None:
        return "NEUTRAL"
    if rsi < 30 and price <= bb_lower:
        return "STRONG BUY"
    if rsi > 70 and price >= bb_upper:
        return "STRONG SELL"
    if rsi < 40 and price < bb_lower:
        return "BUY"
    if rsi > 60 and price > bb_upper:
        return "SELL"
    if rsi < 50:
        return "WEAK BUY"
    if rsi > 50:
        return "WEAK SELL"
    return "NEUTRAL"


# ══════════════════════════════════════════════════════════════════════════════
#  ETL — fetch Indodax tiap 1 menit
# ══════════════════════════════════════════════════════════════════════════════

async def etl_fetch() -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(INDODAX_URL)
            r.raise_for_status()
            return r.json()["tickers"]
    except Exception as e:
        etl_log.error("Fetch gagal: %s", e)
        return None


async def etl_save_asset(asset: str, data: dict, ts: datetime) -> bool:
    if not data:
        return False
    vol_key  = f"vol_{asset.split('_')[0]}"
    vol_coin = data.get(vol_key, 0) or 0
    vol_idr  = data.get("vol_idr", 0) or 0
    # server_time dari Indodax adalah Unix timestamp integer (e.g. 1773560623)
    server_time = int(data.get("server_time", 0) or 0)
    try:
        async with db_pool.acquire() as conn:
            exists = await conn.fetchval(
                f"SELECT 1 FROM {asset} WHERE ts=$1 LIMIT 1", ts
            )
            if exists:
                etl_log.warning("Skip %s ts=%s sudah ada", asset, ts)
                return False
            await conn.execute(
                f"""INSERT INTO {asset}
                    (ts, server_time, buy, sell, high, low, last, vol_coin, vol_idr)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)""",
                ts, server_time,
                data.get("buy"),  data.get("sell"),  data.get("high"),
                data.get("low"),  data.get("last"),
                vol_coin, vol_idr,
            )
        etl_log.info("Saved %s @ %s (server_time=%d)", asset, ts, server_time)
        return True
    except Exception as e:
        etl_log.error("DB error %s: %s", asset, e)
        return False


async def etl_run_once() -> int:
    # Kunci dedup dibulatkan ke menit
    ts      = datetime.now().replace(second=0, microsecond=0)
    tickers = await etl_fetch()
    saved   = 0
    if tickers:
        results = await asyncio.gather(*[
            etl_save_asset(a, tickers.get(a, {}), ts) for a in ASSETS
        ])
        saved = sum(bool(r) for r in results)
    etl_status["last_run"]     = datetime.now().isoformat()
    etl_status["total_saved"] += saved
    return saved


async def etl_loop():
    etl_status["running"] = True
    etl_log.info("ETL loop aktif — interval 60 detik (debug=%s)", ETL_DEBUG_MODE)
    while True:
        try:
            if ETL_DEBUG_MODE:
                tickers = await etl_fetch()
                ts = datetime.now().replace(second=0, microsecond=0)
                if tickers:
                    await asyncio.gather(*[
                        etl_save_asset(a, tickers.get(a, {}), ts) for a in ASSETS
                    ])
                etl_log.info("Debug: sleep %ds", ETL_DEBUG_INTERVAL)
                await asyncio.sleep(ETL_DEBUG_INTERVAL)
            else:
                # Produksi: tunggu hingga detik ke-0 menit berikutnya
                now      = datetime.now()
                next_run = (now + timedelta(minutes=1)).replace(
                    second=0, microsecond=0
                )
                secs = max((next_run - datetime.now()).total_seconds(), 1.0)
                etl_status["next_run"] = next_run.isoformat()
                etl_log.info(
                    "Next ETL: %s (%.0fs)", next_run.strftime("%H:%M:%S"), secs
                )
                await asyncio.sleep(secs)
                await etl_run_once()
        except asyncio.CancelledError:
            break
        except Exception as e:
            etl_status["last_error"] = str(e)
            etl_log.error("ETL error: %s — retry 30s", e)
            await asyncio.sleep(30)
    etl_status["running"] = False


# ══════════════════════════════════════════════════════════════════════════════
#  LIFESPAN
# ══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(
        dsn=DB_DSN, min_size=2, max_size=10, command_timeout=30
    )
    logger.info("DB pool siap (asyncpg) — user farisalfatih")

    etl_task = None
    if ETL_ENABLED:
        await etl_run_once()
        etl_task = asyncio.create_task(etl_loop())
        logger.info("ETL task started — interval 60 detik")

    yield

    if etl_task:
        etl_task.cancel()
        try:
            await etl_task
        except asyncio.CancelledError:
            pass
    await db_pool.close()
    logger.info("Shutdown selesai")


# ══════════════════════════════════════════════════════════════════════════════
#  APP
# ══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="Pemograman Kripto API",
    version="4.1.0",
    docs_url="/api/docs",
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ── Static Files ──────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

@app.get("/static/styles.css", include_in_schema=False)
async def serve_css():
    return FileResponse(os.path.join(BASE_DIR, "styles.css"), media_type="text/css")

@app.get("/static/script.js", include_in_schema=False)
async def serve_js():
    return FileResponse(os.path.join(BASE_DIR, "script.js"), media_type="application/javascript")


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {"status": "ok", "database": db_status, "etl": etl_status}


@app.get("/api/data")
async def get_all_data(
    days: int = Query(
        default=DEFAULT_DAYS, ge=1, le=MAX_DAYS,
        description=f"Rentang hari data (1–{MAX_DAYS})"
    )
):
    """Mengembalikan OHLCV + indikator (RSI, BB, Signal) semua pair."""
    limit   = days * ROWS_PER_DAY + WARMUP_ROWS
    results = await asyncio.gather(*[
        _query_and_compute(p, limit, days) for p in ASSETS
    ])
    return {
        "status":       "ok",
        "assets":       ASSETS,
        "days":         days,
        "data":         dict(zip(ASSETS, results)),
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/data/{pair}")
async def get_pair_data(
    pair: str,
    days: int = Query(default=DEFAULT_DAYS, ge=1, le=MAX_DAYS)
):
    if pair not in ASSETS:
        raise HTTPException(404, f"Pair tidak valid. Pilihan: {ASSETS}")
    limit  = days * ROWS_PER_DAY + WARMUP_ROWS
    result = await _query_and_compute(pair, limit, days)
    return {
        "status": "ok", "pair": pair, "days": days,
        "data": result, "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/etl/status")
async def get_etl_status():
    return etl_status


@app.post("/api/etl/run")
async def trigger_etl():
    saved = await etl_run_once()
    return {"status": "ok", "saved": saved}


# ── DB query + compute indikator ──────────────────────────────────────────────

async def _query_and_compute(pair: str, limit: int, days: int) -> dict:
    """
    1. Ambil data dari DB (display + warmup rows)
    2. Hitung RSI + BB di Python
    3. Buang warmup, kirim hanya baris sesuai rentang hari
    """
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                f"""SELECT ts, server_time,
                           buy, sell, high, low, last,
                           vol_coin, vol_idr
                    FROM {pair}
                    ORDER BY ts DESC
                    LIMIT $1""",
                limit,
            )
    except Exception as e:
        logger.error("Query %s: %s", pair, e)
        return {"error": str(e), "rows": [], "count": 0}

    if not rows:
        return {"rows": [], "count": 0}

    # Kembalikan ke urutan ASC (lama → baru)
    raw = []
    for r in reversed(rows):
        rec = dict(r)
        # DECIMAL → float
        for k in ("buy", "sell", "high", "low", "last", "vol_coin", "vol_idr"):
            if rec.get(k) is not None:
                rec[k] = float(rec[k])
        # ts (TIMESTAMP) → string ISO tanpa timezone
        v = rec.get("ts")
        if v and hasattr(v, "strftime"):
            rec["ts"] = v.strftime("%Y-%m-%dT%H:%M:%S")
        # server_time sudah BIGINT (Unix timestamp integer) — kirim apa adanya
        # JS: new Date(row.server_time * 1000) untuk konversi ke waktu lokal
        raw.append(rec)

    # Hitung indikator (warmup ikut agar RSI dan BB akurat)
    computed = compute_indicators(raw)

    # Buang baris warmup — kirim hanya sejumlah hari yang diminta
    display_limit = days * ROWS_PER_DAY
    display = (
        computed[-display_limit:]
        if len(computed) > display_limit
        else computed
    )

    return {"rows": display, "count": len(display)}
