-- ═══════════════════════════════════════════════════════════════════════════
--  pemograman_kripto — schema.sql  (PostgreSQL 14+)
--
--  Konversi Unix timestamp referensi:
--    1773560623  →  Minggu, 15 Maret 2026  07:43:43 UTC
--                →  Minggu, 15 Maret 2026  14:43:43 WIB (+7)
--    Query: SELECT to_timestamp(1773560623) AT TIME ZONE 'Asia/Jakarta';
--
--  ETL interval : tiap 1 menit  →  ± 1.440 baris / hari per pair
--  Indikator    : RSI(14) + BB(20,2) dihitung di Python (library ta)
--                 disimpan di API layer, TIDAK di DB
--  Owner        : farisalfatih
-- ═══════════════════════════════════════════════════════════════════════════

-- Jalankan sebagai superuser dulu, lalu hubungkan ke database yang sudah dibuat:
--   psql -U postgres
--   CREATE DATABASE pemograman_kripto OWNER farisalfatih;
--   \c pemograman_kripto
--   \i schema.sql




-- ═══════════════════════════════════════════════════════════════════════════
--  TABEL OHLCV PER PAIR
--  Kolom:
--    id          BIGSERIAL PRIMARY KEY
--    ts          TIMESTAMP  — waktu ETL dibulatkan ke menit (UNIQUE, kunci dedup)
--    server_time BIGINT     — Unix timestamp INT dari Indodax (e.g. 1773560623)
--    buy/sell/high/low/last NUMERIC(20,2)
--    vol_coin    NUMERIC(28,8) — volume koin (BTC/ETH/dll)
--    vol_idr     NUMERIC(28,2) — volume dalam IDR
--    created_at  TIMESTAMP  DEFAULT now()
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── btc_idr ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS btc_idr (
    id          BIGSERIAL        PRIMARY KEY,
    ts          TIMESTAMP        NOT NULL,
    server_time BIGINT           NOT NULL,
    buy         NUMERIC(20,2)    NOT NULL,
    sell        NUMERIC(20,2)    NOT NULL,
    high        NUMERIC(20,2)    NOT NULL,
    low         NUMERIC(20,2)    NOT NULL,
    last        NUMERIC(20,2)    NOT NULL,
    vol_coin    NUMERIC(28,8)    NOT NULL DEFAULT 0,
    vol_idr     NUMERIC(28,2)    NOT NULL DEFAULT 0,
    created_at  TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT uq_btc_ts UNIQUE (ts)
);

COMMENT ON TABLE  btc_idr             IS 'OHLCV BTC/IDR — ETL tiap 1 menit dari Indodax';
COMMENT ON COLUMN btc_idr.ts          IS 'Waktu ETL dibulatkan ke menit, kunci dedup';
COMMENT ON COLUMN btc_idr.server_time IS 'Unix timestamp dari Indodax (INT), e.g. 1773560623';
COMMENT ON COLUMN btc_idr.last        IS 'Close price — dasar kalkulasi RSI dan BB di Python';
COMMENT ON COLUMN btc_idr.vol_coin    IS 'Volume BTC';

CREATE INDEX IF NOT EXISTS idx_btc_ts          ON btc_idr (ts          DESC);
CREATE INDEX IF NOT EXISTS idx_btc_server_time ON btc_idr (server_time DESC);
CREATE INDEX IF NOT EXISTS idx_btc_created     ON btc_idr (created_at  DESC);


-- ─── eth_idr ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eth_idr (
    id          BIGSERIAL        PRIMARY KEY,
    ts          TIMESTAMP        NOT NULL,
    server_time BIGINT           NOT NULL,
    buy         NUMERIC(20,2)    NOT NULL,
    sell        NUMERIC(20,2)    NOT NULL,
    high        NUMERIC(20,2)    NOT NULL,
    low         NUMERIC(20,2)    NOT NULL,
    last        NUMERIC(20,2)    NOT NULL,
    vol_coin    NUMERIC(28,8)    NOT NULL DEFAULT 0,
    vol_idr     NUMERIC(28,2)    NOT NULL DEFAULT 0,
    created_at  TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT uq_eth_ts UNIQUE (ts)
);

COMMENT ON TABLE  eth_idr             IS 'OHLCV ETH/IDR — ETL tiap 1 menit dari Indodax';
COMMENT ON COLUMN eth_idr.server_time IS 'Unix timestamp dari Indodax (INT)';
COMMENT ON COLUMN eth_idr.vol_coin    IS 'Volume ETH';

CREATE INDEX IF NOT EXISTS idx_eth_ts          ON eth_idr (ts          DESC);
CREATE INDEX IF NOT EXISTS idx_eth_server_time ON eth_idr (server_time DESC);
CREATE INDEX IF NOT EXISTS idx_eth_created     ON eth_idr (created_at  DESC);


-- ─── ada_idr ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ada_idr (
    id          BIGSERIAL        PRIMARY KEY,
    ts          TIMESTAMP        NOT NULL,
    server_time BIGINT           NOT NULL,
    buy         NUMERIC(20,2)    NOT NULL,
    sell        NUMERIC(20,2)    NOT NULL,
    high        NUMERIC(20,2)    NOT NULL,
    low         NUMERIC(20,2)    NOT NULL,
    last        NUMERIC(20,2)    NOT NULL,
    vol_coin    NUMERIC(28,8)    NOT NULL DEFAULT 0,
    vol_idr     NUMERIC(28,2)    NOT NULL DEFAULT 0,
    created_at  TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT uq_ada_ts UNIQUE (ts)
);

COMMENT ON TABLE  ada_idr             IS 'OHLCV ADA/IDR — ETL tiap 1 menit dari Indodax';
COMMENT ON COLUMN ada_idr.server_time IS 'Unix timestamp dari Indodax (INT)';
COMMENT ON COLUMN ada_idr.vol_coin    IS 'Volume ADA';

CREATE INDEX IF NOT EXISTS idx_ada_ts          ON ada_idr (ts          DESC);
CREATE INDEX IF NOT EXISTS idx_ada_server_time ON ada_idr (server_time DESC);
CREATE INDEX IF NOT EXISTS idx_ada_created     ON ada_idr (created_at  DESC);


-- ─── bnb_idr ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bnb_idr (
    id          BIGSERIAL        PRIMARY KEY,
    ts          TIMESTAMP        NOT NULL,
    server_time BIGINT           NOT NULL,
    buy         NUMERIC(20,2)    NOT NULL,
    sell        NUMERIC(20,2)    NOT NULL,
    high        NUMERIC(20,2)    NOT NULL,
    low         NUMERIC(20,2)    NOT NULL,
    last        NUMERIC(20,2)    NOT NULL,
    vol_coin    NUMERIC(28,8)    NOT NULL DEFAULT 0,
    vol_idr     NUMERIC(28,2)    NOT NULL DEFAULT 0,
    created_at  TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT uq_bnb_ts UNIQUE (ts)
);

COMMENT ON TABLE  bnb_idr             IS 'OHLCV BNB/IDR — ETL tiap 1 menit dari Indodax';
COMMENT ON COLUMN bnb_idr.server_time IS 'Unix timestamp dari Indodax (INT)';
COMMENT ON COLUMN bnb_idr.vol_coin    IS 'Volume BNB';

CREATE INDEX IF NOT EXISTS idx_bnb_ts          ON bnb_idr (ts          DESC);
CREATE INDEX IF NOT EXISTS idx_bnb_server_time ON bnb_idr (server_time DESC);
CREATE INDEX IF NOT EXISTS idx_bnb_created     ON bnb_idr (created_at  DESC);


-- ─── usdt_idr ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usdt_idr (
    id          BIGSERIAL        PRIMARY KEY,
    ts          TIMESTAMP        NOT NULL,
    server_time BIGINT           NOT NULL,
    buy         NUMERIC(20,2)    NOT NULL,
    sell        NUMERIC(20,2)    NOT NULL,
    high        NUMERIC(20,2)    NOT NULL,
    low         NUMERIC(20,2)    NOT NULL,
    last        NUMERIC(20,2)    NOT NULL,
    vol_coin    NUMERIC(28,8)    NOT NULL DEFAULT 0,
    vol_idr     NUMERIC(28,2)    NOT NULL DEFAULT 0,
    created_at  TIMESTAMP        NOT NULL DEFAULT now(),
    CONSTRAINT uq_usdt_ts UNIQUE (ts)
);

COMMENT ON TABLE  usdt_idr             IS 'OHLCV USDT/IDR — ETL tiap 1 menit dari Indodax';
COMMENT ON COLUMN usdt_idr.server_time IS 'Unix timestamp dari Indodax (INT)';
COMMENT ON COLUMN usdt_idr.vol_coin    IS 'Volume USDT';

CREATE INDEX IF NOT EXISTS idx_usdt_ts          ON usdt_idr (ts          DESC);
CREATE INDEX IF NOT EXISTS idx_usdt_server_time ON usdt_idr (server_time DESC);
CREATE INDEX IF NOT EXISTS idx_usdt_created     ON usdt_idr (created_at  DESC);


-- ═══════════════════════════════════════════════════════════════════════════
--  VIEW — harga terakhir semua pair (monitoring cepat)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_latest_tickers AS
    SELECT * FROM (SELECT 'btc_idr'  AS pair, ts, server_time,
           to_timestamp(server_time) AT TIME ZONE 'Asia/Jakarta' AS ts_wib,
           last, buy, sell, high, low, vol_idr
    FROM btc_idr ORDER BY ts DESC LIMIT 1) q1
UNION ALL
    SELECT * FROM (SELECT 'eth_idr', ts, server_time,
           to_timestamp(server_time) AT TIME ZONE 'Asia/Jakarta',
           last, buy, sell, high, low, vol_idr
    FROM eth_idr ORDER BY ts DESC LIMIT 1) q2
UNION ALL
    SELECT * FROM (SELECT 'ada_idr', ts, server_time,
           to_timestamp(server_time) AT TIME ZONE 'Asia/Jakarta',
           last, buy, sell, high, low, vol_idr
    FROM ada_idr ORDER BY ts DESC LIMIT 1) q3
UNION ALL
    SELECT * FROM (SELECT 'bnb_idr', ts, server_time,
           to_timestamp(server_time) AT TIME ZONE 'Asia/Jakarta',
           last, buy, sell, high, low, vol_idr
    FROM bnb_idr ORDER BY ts DESC LIMIT 1) q4
UNION ALL
    SELECT * FROM (SELECT 'usdt_idr', ts, server_time,
           to_timestamp(server_time) AT TIME ZONE 'Asia/Jakarta',
           last, buy, sell, high, low, vol_idr
    FROM usdt_idr ORDER BY ts DESC LIMIT 1) q5;

COMMENT ON VIEW v_latest_tickers IS 'Snapshot harga terakhir semua pair, ts_wib = WIB (+7)';


-- ═══════════════════════════════════════════════════════════════════════════
--  HAK AKSES — user farisalfatih
-- ═══════════════════════════════════════════════════════════════════════════

-- Buat user jika belum ada (jalankan sebagai superuser):
-- CREATE USER farisalfatih WITH PASSWORD 'ISI_PASSWORD_ANDA';

-- GRANT CONNECT ON DATABASE pemograman_kripto TO farisalfatih;
-- 
-- GRANT USAGE  ON SCHEMA public TO farisalfatih;
-- 
-- GRANT SELECT, INSERT, UPDATE, DELETE
--     ON btc_idr, eth_idr, ada_idr, bnb_idr, usdt_idr
--     TO farisalfatih;
-- 
-- GRANT SELECT ON v_latest_tickers TO farisalfatih;
-- 
-- -- Izinkan NEXTVAL untuk BIGSERIAL (id auto-increment)
-- GRANT USAGE, SELECT
--     ON SEQUENCE btc_idr_id_seq,
--                 eth_idr_id_seq,
--                 ada_idr_id_seq,
--                 bnb_idr_id_seq,
--                 usdt_idr_id_seq
--     TO farisalfatih;


-- ═══════════════════════════════════════════════════════════════════════════
--  VERIFIKASI SETELAH INSTALL
-- ═══════════════════════════════════════════════════════════════════════════

-- Cek semua tabel terbuat:
--   \dt

-- Konversi Unix timestamp:
--   SELECT to_timestamp(1773560623) AS utc,
--          to_timestamp(1773560623) AT TIME ZONE 'Asia/Jakarta' AS wib;
--   → utc : 2026-03-15 07:43:43+00
--   → wib : 2026-03-15 14:43:43

-- Cek view:
--   SELECT * FROM v_latest_tickers;

-- Hitung baris tiap pair setelah ETL berjalan beberapa saat:
--   SELECT 'btc_idr'  AS pair, COUNT(*) FROM btc_idr
--   UNION ALL
--   SELECT 'eth_idr',           COUNT(*) FROM eth_idr
--   UNION ALL
--   SELECT 'ada_idr',           COUNT(*) FROM ada_idr
--   UNION ALL
--   SELECT 'bnb_idr',           COUNT(*) FROM bnb_idr
--   UNION ALL
--   SELECT 'usdt_idr',          COUNT(*) FROM usdt_idr;
