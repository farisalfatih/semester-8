"""
pemograman-kripto — app.py
FastAPI + asyncio + asyncpg
ETL Indodax tiap jam, raw OHLCV dikirim ke browser.
Indikator dihitung di browser (TechnicalIndicators CDN).
Tanpa login — endpoint langsung bisa diakses.
"""

import os
import asyncio
import logging
import sys
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import asyncpg
import httpx
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response

# ─── .env ─────────────────────────────────────────
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
ETL_DEBUG_INTERVAL = int(os.getenv("ETL_DEBUG_INTERVAL", "5"))

INDODAX_URL  = "https://indodax.com/api/tickers"
ASSETS       = ["btc_idr", "eth_idr", "ada_idr", "bnb_idr", "usdt_idr"]
ROWS_PER_DAY = 24          # data per jam
DEFAULT_DAYS = 7
MAX_DAYS     = 90
# Warmup rows agar BB(20) dan RSI(14) valid sejak data pertama
WARMUP_ROWS  = 25

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))


# ─── Logging ──────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s - %(name)s - %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger  = logging.getLogger("api")
etl_log = logging.getLogger("etl")

# Saring log bot scanner agar tidak bising
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

# ─── ETL status ────────────────────────────────────
etl_status: Dict[str, Any] = {
    "running":     False,
    "last_run":    None,
    "next_run":    None,
    "last_error":  None,
    "total_saved": 0,
}

# ─── DB pool (dibuat di lifespan) ──────────────────
db_pool: Optional[asyncpg.Pool] = None

# ══════════════════════════════════════════════════
#  ETL
# ══════════════════════════════════════════════════
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
                    (buy, sell, high, low, last, vol_btc, vol_idr, server_time, ts)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)""",
                data.get("buy"),  data.get("sell"),  data.get("high"),
                data.get("low"),  data.get("last"),  vol_coin,
                vol_idr,          data.get("server_time"), ts,
            )
        etl_log.info("Saved %s at %s", asset, ts)
        return True
    except Exception as e:
        etl_log.error("DB error %s: %s", asset, e)
        return False


async def etl_run_once() -> int:
    # Gunakan waktu jam bulat sebagai kunci dedup
    ts      = datetime.now().replace(minute=0, second=0, microsecond=0)
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
    etl_log.info("ETL loop aktif (debug=%s)", ETL_DEBUG_MODE)
    while True:
        try:
            if ETL_DEBUG_MODE:
                tickers = await etl_fetch()
                ts = datetime.now()
                if tickers:
                    await asyncio.gather(*[
                        etl_save_asset(a, tickers.get(a, {}), ts) for a in ASSETS
                    ])
                etl_log.info("Debug: sleep %ds", ETL_DEBUG_INTERVAL)
                await asyncio.sleep(ETL_DEBUG_INTERVAL)
            else:
                now      = datetime.now()
                next_run = (now + timedelta(hours=1)).replace(
                    minute=0, second=0, microsecond=0
                )
                secs = max((next_run - datetime.now()).total_seconds(), 1.0)
                etl_status["next_run"] = next_run.isoformat()
                etl_log.info("Next ETL: %s (%.0fs)", next_run, secs)
                await asyncio.sleep(secs)
                await etl_run_once()
        except asyncio.CancelledError:
            break
        except Exception as e:
            etl_status["last_error"] = str(e)
            etl_log.error("ETL error: %s — retry 60s", e)
            await asyncio.sleep(60)
    etl_status["running"] = False


# ══════════════════════════════════════════════════
#  LIFESPAN
# ══════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(
        dsn=DB_DSN, min_size=2, max_size=10, command_timeout=30
    )
    logger.info("DB pool siap (asyncpg)")

    etl_task = None
    if ETL_ENABLED:
        etl_task = asyncio.create_task(etl_loop())
        logger.info("ETL task started")

    yield  # ← aplikasi berjalan

    if etl_task:
        etl_task.cancel()
        try:
            await etl_task
        except asyncio.CancelledError:
            pass
    await db_pool.close()
    logger.info("Shutdown selesai")


# ══════════════════════════════════════════════════
#  APP
# ══════════════════════════════════════════════════
app = FastAPI(
    title="Pemograman Kripto API",
    version="3.2.0",
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

# Serve styles.css dan script.js langsung via route — simpel, tidak perlu folder extra


# ══════════════════════════════════════════════════
#  ROUTES — HALAMAN
# ══════════════════════════════════════════════════
@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

@app.get("/static/styles.css", include_in_schema=False)
async def serve_css():
    return FileResponse(os.path.join(BASE_DIR, "styles.css"), media_type="text/css")

@app.get("/static/script.js", include_in_schema=False)
async def serve_js():
    return FileResponse(os.path.join(BASE_DIR, "script.js"), media_type="application/javascript")


# ══════════════════════════════════════════════════
#  ROUTES — API
# ══════════════════════════════════════════════════
@app.get("/api/health")
async def health():
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db = "connected"
    except Exception:
        db = "disconnected"
    return {"status": "ok", "database": db, "etl": etl_status}


@app.get("/api/data")
async def get_all_data(
    days: int = Query(
        default=DEFAULT_DAYS, ge=1, le=MAX_DAYS,
        description=f"Rentang hari data (1–{MAX_DAYS})"
    )
):
    """Raw OHLCV semua pair. Indikator dihitung di browser."""
    limit   = days * ROWS_PER_DAY + WARMUP_ROWS
    results = await asyncio.gather(*[_query_pair(p, limit) for p in ASSETS])
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
    limit = days * ROWS_PER_DAY + WARMUP_ROWS
    data  = await _query_pair(pair, limit)
    return {
        "status": "ok", "pair": pair, "days": days,
        "data": data, "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@app.get("/api/etl/status")
async def get_etl_status():
    return etl_status


@app.post("/api/etl/run")
async def trigger_etl():
    saved = await etl_run_once()
    return {"status": "ok", "saved": saved}


# ── DB query ───────────────────────────────────────
async def _query_pair(pair: str, limit: int) -> Dict[str, Any]:
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                f"""SELECT buy, sell, high, low, last,
                           vol_btc, vol_idr, server_time, ts
                    FROM {pair}
                    ORDER BY ts DESC
                    LIMIT $1""",
                limit,
            )
    except Exception as e:
        logger.error("Query %s: %s", pair, e)
        return {"error": str(e), "rows": [], "count": 0}

    records = []
    for r in reversed(rows):           # kembalikan ke urutan ASC (lama→baru)
        rec = dict(r)
        for k in ("buy", "sell", "high", "low", "last", "vol_btc", "vol_idr"):
            if rec.get(k) is not None:
                rec[k] = float(rec[k])
        for k in ("server_time", "ts"):
            v = rec.get(k)
            if v and hasattr(v, "isoformat"):
                rec[k] = v.isoformat()
        records.append(rec)

    return {"rows": records, "count": len(records)}
