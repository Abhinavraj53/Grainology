"""
config.py - Central configuration for India Grain Price Forecasting Dashboard
Grains: Wheat, Paddy, Maize, Mustard
Horizons: 7, 30, 90 days
"""
import os
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

# Compute today's date in Indian Standard Time (UTC+5:30)
def _ist_today() -> str:
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).strftime("%Y-%m-%d")

def _ist_month_start() -> str:
    ist = timezone(timedelta(hours=5, minutes=30))
    dt = datetime.now(ist)
    return dt.strftime(f"{dt.year}-{dt.month:02d}-01")

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = r"c:\Users\jkail\Downloads\Test\commodity_forecasting_v36_with_arrival_csv_bundle"
CSV_DIR  = os.path.join(DATA_DIR, "daily-commodity-prices-india", "csv")
LATEST_DATA_CSV = os.path.join(DATA_DIR, "latest_data.csv")
ARRIVAL_CSV     = os.path.join(DATA_DIR, "arrival_daily_date_only.csv")
OUTPUT_DIR      = os.path.join(BASE_DIR, "output")
DASHBOARD_DIR   = os.path.join(BASE_DIR, "dashboard")
DASHBOARD_DATA  = os.path.join(DASHBOARD_DIR, "data")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DASHBOARD_DATA, exist_ok=True)

# ── AI Reasoning ───────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
USE_GEMINI     = True   # falls back to rule-based if API fails

# ── Target commodities ─────────────────────────────────────────────────────
TARGET_GRAINS = {
    "Wheat": {
        "keywords": ["wheat"],
        "color": "#F59E0B",          # amber
        "icon": "🌾",
        "group": "major_grains",
        "unit": "Rs/Quintal",
        "msp": {                      # Minimum Support Price by year
            2001:580, 2002:610, 2003:620, 2004:630, 2005:640, 2006:650,
            2007:700, 2008:750, 2009:800, 2010:850, 2011:900, 2012:965,
            2013:1035,2014:1400,2015:1450,2016:1525,2017:1625,2018:1735,
            2019:1840,2020:1925,2021:1975,2022:2015,2023:2125,2024:2275,
            2025:2425,2026:2600,
        },
        "harvest_months": [3, 4],
        "sowing_months":  [10, 11, 12],
    },
    "Paddy": {
        "keywords": ["paddy"],
        "color": "#10B981",          # emerald
        "icon": "🍚",
        "group": "major_grains",
        "unit": "Rs/Quintal",
        "msp": {
            2001:530, 2002:530, 2003:550, 2004:560, 2005:570, 2006:580,
            2007:645, 2008:745, 2009:950, 2010:1000,2011:1080,2012:1250,
            2013:1310,2014:1360,2015:1410,2016:1470,2017:1550,2018:1750,
            2019:1815,2020:1868,2021:1940,2022:2040,2023:2183,2024:2300,
            2025:2425,2026:2550,
        },
        "harvest_months": [9, 10, 11],
        "sowing_months":  [6, 7],
    },
    "Maize": {
        "keywords": ["maize", "corn"],
        "color": "#F97316",          # orange
        "icon": "🌽",
        "group": "major_grains",
        "unit": "Rs/Quintal",
        "msp": {
            2001:330, 2002:330, 2003:330, 2004:340, 2005:350, 2006:360,
            2007:395, 2008:415, 2009:840, 2010:880, 2011:980, 2012:1175,
            2013:1310,2014:1310,2015:1325,2016:1365,2017:1425,2018:1700,
            2019:1760,2020:1850,2021:1870,2022:1962,2023:2090,2024:2225,
            2025:2350,2026:2465,
        },
        "harvest_months": [9, 10],
        "sowing_months":  [6, 7],
    },
    "Mustard": {
        "keywords": ["mustard", "rapeseed"],
        "color": "#A78BFA",          # violet
        "icon": "🌿",
        "group": "oilseeds",
        "unit": "Rs/Quintal",
        "msp": {
            2001:1600,2002:1600,2003:1500,2004:1500,2005:1700,2006:1715,
            2007:1800,2008:1830,2009:1830,2010:1830,2011:1850,2012:2500,
            2013:3000,2014:3000,2015:3350,2016:3350,2017:3700,2018:4000,
            2019:4200,2020:4425,2021:4650,2022:5050,2023:5450,2024:5650,
            2025:5950,2026:6200,
        },
        "harvest_months": [2, 3],
        "sowing_months":  [10, 11],
    },
}

# ── Forecast horizons ──────────────────────────────────────────────────────
FORECAST_HORIZONS = [6, 7, 8, 9, 10, 30, 90]
HORIZON_LABELS = {h: f"{h}-Day" for h in FORECAST_HORIZONS}

# ── Training config ────────────────────────────────────────────────────────
TRAINING_START_YEAR  = 2001          # Full history for best accuracy
VALIDATION_DAYS      = 365           # Last 1 year = validation set
PRICE_MIN, PRICE_MAX = 1, 500_000
SEED = 42

# ── Feature engineering ────────────────────────────────────────────────────
LAG_DAYS         = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60, 90]
ROLL_WINDOWS     = [7, 14, 30, 60, 90]
EWMA_SPANS       = [7, 14, 30, 90, 180]
LOG_RETURN_LAGS  = [1, 7, 14, 30]
TREND_WINDOWS    = [7, 30]
FOURIER_K        = 4                  # sin/cos pairs
ARRIVAL_LAGS     = [1, 2, 3, 7, 14, 30, 60, 90]
ARRIVAL_ROLLS    = [7, 14, 30, 60, 90]

# ── Model config ───────────────────────────────────────────────────────────
LGBM_PARAMS = {
    "n_estimators": 3000,
    "learning_rate": 0.01,
    "num_leaves": 127,
    "min_child_samples": 50,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "reg_alpha": 0.5,
    "reg_lambda": 5.0,
    "objective": "huber",
    "random_state": SEED,
    "n_jobs": -1,
    "verbose": -1,
}

XGB_PARAMS = {
    "n_estimators": 2000,
    "learning_rate": 0.01,
    "max_depth": 7,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "reg_alpha": 0.5,
    "reg_lambda": 5.0,
    "objective": "reg:pseudohubererror",
    "random_state": SEED,
    "n_jobs": -1,
    "verbosity": 0,
    "early_stopping_rounds": 200,
}

CAT_PARAMS = {
    "iterations": 2000,
    "learning_rate": 0.01,
    "depth": 7,
    "l2_leaf_reg": 5.0,
    "loss_function": "RMSE",
    "random_seed": SEED,
    "verbose": 0,
    "early_stopping_rounds": 200,
}

OPTUNA_TRIALS   = 15
OPTUNA_TIMEOUT  = 60   # seconds per model

# ── Conformal prediction ───────────────────────────────────────────────────
CONFORMAL_LOWER_Q = 0.10
CONFORMAL_UPPER_Q = 0.90

# ── Dashboard ──────────────────────────────────────────────────────────────
# Dynamic: always computed from today's IST date
ACTUALS_START_DATE = _ist_month_start()   # 1st of current month
FORECAST_AS_OF     = "2026-07-04"         # Anchor forecast to last known data
