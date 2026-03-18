import requests
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def get_data():
    data = requests.get("https://indodax.com/api/tickers").json()["tickers"]
    result = []
    for pair, v in data.items():
        coin = pair.split("_")[0]
        vol_coin_key = f"vol_{coin}"
        result.append((
            pair,
            float(v.get("buy", 0)),
            float(v.get("sell", 0)),
            float(v.get("low", 0)),
            float(v.get("high", 0)),
            float(v.get("last", 0)),
            int(v.get("server_time", 0)),
            float(v.get(vol_coin_key, 0)),
            float(v.get("vol_idr", 0))
        ))
    return result

conn = pymysql.connect(
    host=os.environ["MYSQL_HOST"],
    port=int(os.environ["MYSQL_PORT"]),
    user=os.environ["MYSQL_USER"],
    password=os.environ["MYSQL_PASSWORD"],
    database=os.environ["MYSQL_DB"],
    autocommit=False
)

def insert_data():
    with conn.cursor() as cursor:
        insert_sql = """
          INSERT INTO tickers_indodax
          (pair, buy, sell, low, high, last, server_time, vol_coin, vol_idr)
          VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_sql, get_data())
        conn.commit()

insert_data()
