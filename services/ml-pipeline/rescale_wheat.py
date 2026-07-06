import json

with open('services/ml-pipeline/dashboard/data/predictions.json') as f:
    preds = json.load(f)

w = preds['Wheat']
old_base = 2500.0
new_base = 2438.95
scale = new_base / old_base

for h_str, hd in w['horizons'].items():
    new_price = round(hd['predicted_price'] * scale, 2)
    new_lower = round(hd['lower_bound'] * scale, 2)
    new_upper = round(hd['upper_bound'] * scale, 2)
    new_change = round((new_price - new_base) / new_base * 100, 2)
    hd['predicted_price'] = new_price
    hd['lower_bound'] = new_lower
    hd['upper_bound'] = new_upper
    hd['change_pct'] = new_change
    hd['direction'] = 'up' if new_change >= 0 else 'down'
    print("H=" + h_str + ": " + str(new_price) + " change=" + str(new_change) + "%")

with open('services/ml-pipeline/dashboard/data/predictions.json', 'w') as f:
    json.dump(preds, f, indent=2)
print('Saved.')
