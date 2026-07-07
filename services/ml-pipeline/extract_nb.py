import json

with open(r'c:\Users\jkail\Downloads\commodity_forecasting_v36_with_arrival_csv_bundle\notebook847e0140f7 (40).ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

with open(r'c:\Users\jkail\Downloads\commodity_forecasting_v36_with_arrival_csv_bundle\notebook_extracted.txt', 'w', encoding='utf-8') as f_out:
    for i, cell in enumerate(nb.get('cells', [])):
        cell_type = cell.get('cell_type')
        f_out.write(f'\n--- Cell {i} ({cell_type}) ---\n')
        f_out.write(''.join(cell.get('source', [])) + '\n')
print('Extraction complete.')
