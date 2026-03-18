import requests

def get_data():
    data = requests.get("https://indodax.com/api/tickers").json()["tickers"]
    result = []
    for pair, v in data.items():
        coin = pair.split("_")[0]  # ambil nama coin
        vol_coin_key = f"vol_{coin}"
        result.append({
            "pair": pair,
            "buy": float(v.get("buy", 0)),
            "sell": float(v.get("sell", 0)),
            "low": float(v.get("low", 0)),
            "high": float(v.get("high", 0)),
            "last": float(v.get("last", 0)),
            "server_time": int(v.get("server_time", 0)),
            "vol_coin": float(v.get(vol_coin_key, 0)),
            "vol_idr": float(v.get("vol_idr", 0))  # aman jika key tidak ada
        })
    return result

def print_data():
    data = get_data()
    
    # header tabel
    headers = ["No", "Pair", "Buy", "Sell", "Low", "High", "Last", "Server Time", "Vol Coin", "Vol IDR"]
    print("{:<4} {:<15} {:<20} {:<20} {:<20} {:<20} {:<20} {:<12} {:<20} {:<20}".format(*headers))
    print("=" * 175)
    
    for idx, row in enumerate(data, start=1):
        print("{:<4} {:<15} {:<20,.0f} {:<20,.0f} {:<20,.0f} {:<20,.0f} {:<20,.0f} {:<12} {:<20,.4f} {:<20,.0f}".format(
            idx, row["pair"], row["buy"], row["sell"], row["low"], row["high"], row["last"],
            row["server_time"], row["vol_coin"], row["vol_idr"]
        ))

print_data()
