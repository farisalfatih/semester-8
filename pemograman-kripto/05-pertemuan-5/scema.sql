CREATE DATABASE pemograman_kripto;
\c pemograman_kripto

-- Buat tabel per asset
CREATE TABLE IF NOT EXISTS btc_idr (
    buy NUMERIC,
    sell NUMERIC,
    high NUMERIC,
    low NUMERIC,
    last NUMERIC,
    vol_btc NUMERIC,
    vol_idr NUMERIC,
    server_time BIGINT,
    ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eth_idr (
    buy NUMERIC,
    sell NUMERIC,
    high NUMERIC,
    low NUMERIC,
    last NUMERIC,
    vol_btc NUMERIC,
    vol_idr NUMERIC,
    server_time BIGINT,
    ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ada_idr (
    buy NUMERIC,
    sell NUMERIC,
    high NUMERIC,
    low NUMERIC,
    last NUMERIC,
    vol_btc NUMERIC,
    vol_idr NUMERIC,
    server_time BIGINT,
    ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bnb_idr (
    buy NUMERIC,
    sell NUMERIC,
    high NUMERIC,
    low NUMERIC,
    last NUMERIC,
    vol_btc NUMERIC,
    vol_idr NUMERIC,
    server_time BIGINT,
    ts TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usdt_idr (
    buy NUMERIC,
    sell NUMERIC,
    high NUMERIC,
    low NUMERIC,
    last NUMERIC,
    vol_btc NUMERIC,
    vol_idr NUMERIC,
    server_time BIGINT,
    ts TIMESTAMP
);
