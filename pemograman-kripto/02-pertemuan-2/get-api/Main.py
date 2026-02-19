import requests
import time
from datetime import datetime

start_time = time.time()
print(f"\nWaktu mulai : {datetime.now()}\n")

url = "https://indodax.com/api/tickers"

request_start = time.time()
response = requests.get(url)
latency = time.time() - request_start

data = response.json()["tickers"]

rows = []

header = [
    "no",
    "pair",
    "server_time",
    "buy",
    "sell",
    "low",
    "high",
    "last",
    "vol_coin",
    "vol_idr"
]

rows.append(header)

for i, (pair, v) in enumerate(data.items(), 1):

    coin = pair.split("_")[0]
    vol_key = f"vol_{coin}"
    vol_idr = int(float(v.get("vol_idr", 0)))

    # ---- FORMAT vol_coin ----
    raw_vol = v.get(vol_key)
    if raw_vol is not None:
        vol_coin = ('%.10f' % float(raw_vol)).rstrip('0').rstrip('.')
    else:
        vol_coin = "-"

    rows.append([
        i,
        pair,
        v.get("server_time"),
        v.get("buy"),
        v.get("sell"),
        v.get("low"),
        v.get("high"),
        v.get("last"),
        vol_coin,
        vol_idr
    ])

widths = [max(len(str(row[i])) for row in rows) for i in range(len(rows[0]))]

for row in rows:
    print("  ".join(str(val).ljust(widths[i]) for i, val in enumerate(row)))

print(f"\nLatency API : {latency:.4f} detik")
print(f"Total runtime : {time.time() - start_time:.4f} detik\n")

