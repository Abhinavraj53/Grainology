import sys
sys.path.insert(0, r'c:\Users\jkail\Downloads\commodity_forecasting_v36_with_arrival_csv_bundle\grain_dashboard')

from data_pipeline import load_yearly_csvs, load_latest_data, clean_and_merge, build_national_daily, load_arrival_csv

print('Testing data pipeline (2024-2026 only for speed)...')
yearly_df = load_yearly_csvs(start_year=2024)
print(f'Yearly rows: {len(yearly_df):,}')
latest_df = load_latest_data()
print(f'Latest rows: {len(latest_df):,}')
combined = clean_and_merge(yearly_df, latest_df)
print(f'Combined rows: {len(combined):,}')
national = build_national_daily(combined)
for grain, df in national.items():
    if len(df) > 0:
        print(f'  {grain}: {len(df)} daily rows, last date: {df["date"].max()}')
    else:
        print(f'  {grain}: no data')
arrival = load_arrival_csv()
print(f'Arrival CSV: {len(arrival)} rows')
print('SMOKE TEST PASSED')
