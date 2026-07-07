import sys
import pandas as pd
from data_pipeline import run_pipeline
from train_models import train_all
import config

print('Starting isolated Paddy training...')
national_daily, arrival_df = run_pipeline()

print('\n--- Training Paddy Ensemble ---')
all_bundles = train_all(
    national_daily, 
    arrival_df, 
    do_tune=True, 
    target_grains={'Rice': config.TARGET_GRAINS['Rice']}
)

print('\n' + '='*50)
print('PADDY ISOLATED RESULTS')
print('='*50)
for horizon, bundle in all_bundles.get('Rice', {}).items():
    m = bundle.get('metrics', {})
    print(f'Horizon {horizon}d: MAPE = {m.get("ensemble_mape"):.3f}% | MAE = {m.get("ensemble_mae"):.2f}')
print('='*50)
