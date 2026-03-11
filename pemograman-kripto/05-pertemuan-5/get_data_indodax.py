import os
import requests
import psycopg2
import time
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": os.getenv("DB_PORT", 5432)
}

URL = "https://indodax.com/api/tickers"
ASSETS = ["btc_idr", "eth_idr", "ada_idr", "bnb_idr", "usdt_idr"]

DEBUG_MODE = False
DEBUG_INTERVAL = 5

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(asctime)s - %(message)s",
    datefmt="%H:%M:%S"
)

def get_next_hour():
    now = datetime.now()
    next_hour = (now + timedelta(hours=1)).replace(minute=0, second=0, microsecond=0)
    return next_hour

def fetch_data():
    try:
        r = requests.get(URL, timeout=10)
        r.raise_for_status()
        return r.json()["tickers"]
    except Exception as e:
        logging.error("Failed to fetch data: %s", e)
        return None

def process_data(asset, data, ts, save_to_db=True):
    if not data:
        logging.warning("No data to process for %s", asset)
        return

    vol_key = f"vol_{asset.split('_')[0]}"
    vol_coin = data.get(vol_key, 0)
    vol_idr = data.get("vol_idr", 0)

    if DEBUG_MODE and not save_to_db:
        logging.info("[DEBUG] %s: buy=%s, sell=%s, high=%s, low=%s, last=%s, vol_coin=%s, vol_idr=%s, server_time=%s",
                     asset, data.get("buy"), data.get("sell"), data.get("high"),
                     data.get("low"), data.get("last"), vol_coin, vol_idr, data.get("server_time"))
        return

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        cur.execute(
            f"""
            INSERT INTO {asset} 
            (buy, sell, high, low, last, vol_btc, vol_idr, server_time, ts)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                data.get("buy"),
                data.get("sell"),
                data.get("high"),
                data.get("low"),
                data.get("last"),
                vol_coin,
                vol_idr,
                data.get("server_time"),
                ts
            )
        )
        conn.commit()
        logging.info("Saved %s at %s", asset, ts)
    except Exception as e:
        logging.error("Failed to save %s: %s", asset, e)
    finally:
        cur.close()
        conn.close()

def main_loop():
    while True:
        if DEBUG_MODE:
            ts = datetime.now() 
            tickers = fetch_data()
            if tickers:
                for asset in ASSETS:
                    process_data(asset, tickers.get(asset, {}), ts, save_to_db=False)
            logging.info("Debug mode: sleeping %ds before next fetch", DEBUG_INTERVAL)
            time.sleep(DEBUG_INTERVAL)
        else:
            next_run = get_next_hour()
            sleep_seconds = (next_run - datetime.now()).total_seconds()
            logging.info("Next run at %s (sleep %.2f sec)", next_run, sleep_seconds)
            
            time.sleep(max(sleep_seconds, 0))
            
            ts = datetime.now().replace(minute=0, second=0, microsecond=0)
            tickers = fetch_data()
            if tickers:
                for asset in ASSETS:
                    process_data(asset, tickers.get(asset, {}), ts, save_to_db=True)

if __name__ == "__main__":
    main_loop()
