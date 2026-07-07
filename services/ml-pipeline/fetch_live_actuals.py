import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta

def _ist_today() -> str:
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).strftime("%Y-%m-%d")

def _ist_month_start() -> str:
    ist = timezone(timedelta(hours=5, minutes=30))
    dt = datetime.now(ist)
    return dt.strftime(f"{dt.year}-{dt.month:02d}-01")

def get_live_actuals(start_date: str = None, end_date: str = None):
    if start_date is None:
        start_date = _ist_month_start()
    if end_date is None:
        end_date = _ist_today()
    print("Fetching live actuals from local Node API...")
    
    url = 'http://127.0.0.1:3001/api/agmarknet/marketwise-price-arrival'
    # Use state=100006 (All States) to get the fast, cached national average data
    payload = {
        "state": 100006, 
        "dashboard": "marketwise_price_arrival", 
        "limit": 150
    }
    req = urllib.request.Request(url, method='POST', headers={'Content-Type': 'application/json'}, data=json.dumps(payload).encode('utf-8'))
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            parsed = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching live actuals from API: {e}")
        parsed = {"records": []}
        
    records = [r.get("raw", r) for r in parsed.get("records", [])]
    
    live_data = {
        "Wheat": [],
        "Paddy": [],
        "Maize": [],
        "Mustard": []
    }
    
    # Extract historical dates directly from API columns
    for r in records:
        cmdt = r.get("cmdt_name", "")
        grain_key = None
        if "Wheat" in cmdt: grain_key = "Wheat"
        elif "Maize" in cmdt: grain_key = "Maize"
        elif "Paddy" in cmdt: grain_key = "Paddy"
        elif "Mustard" in cmdt or "Rapeseed" in cmdt: grain_key = "Mustard"
        
        if grain_key:
            reported_date_str = r.get("reported_date")
            if not reported_date_str:
                continue
            try:
                dt_reported = datetime.strptime(reported_date_str, "%d-%m-%Y")
            except Exception:
                dt_reported = datetime(2026, 7, 4)

            date_keys = {
                "two_day_ago_price": (dt_reported.timestamp() - 2*86400),
                "one_day_ago_price": (dt_reported.timestamp() - 1*86400),
                "as_on_price":        dt_reported.timestamp()
            }
            for dkey, ts in date_keys.items():
                date_iso = datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
                if date_iso >= start_date and date_iso <= end_date:
                    if r.get(dkey):
                        p = float(r[dkey])
                        if p > 0:
                            if not any(x["date"] == date_iso for x in live_data[grain_key]):
                                live_data[grain_key].append({
                                    "date": date_iso,
                                    "price": p,
                                    "price_low":  round(p * 0.95, 2),
                                    "price_high": round(p * 1.05, 2),
                                    "is_highlight": True
                                })

    # Sort all
    for g in live_data:
        live_data[g].sort(key=lambda x: x["date"])

    # Log
    for g, rows in live_data.items():
        if rows:
            print(f"  {g}: {len(rows)} live points, latest {rows[-1]['date']} = Rs.{rows[-1]['price']}")

    return live_data
