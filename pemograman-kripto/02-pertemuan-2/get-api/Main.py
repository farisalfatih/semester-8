import requests
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def get_data():
    data = requests.get("https://indodax.com/api/tickers").json()["tickers"]
    return [
        (pair, int(v["server_time"]), float(v["low"]), float(v["high"]), float(v["last"]))
        for pair, v in data.items()
    ]

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
          INSERT INTO tickers_indodax (pair, server_time, low, high, last)
          VALUES (%s, %s, %s, %s, %s)
        """
        cursor.executemany(insert_sql, get_data())
        conn.commit()

insert_data()
