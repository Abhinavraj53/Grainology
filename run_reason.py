import json
import sys
import os

sys.path.append('services/ml-pipeline')
from reasoning_engine import generate_all_reasoning

with open('services/ml-pipeline/dashboard/data/predictions.json', 'r') as f:
    preds = json.load(f)

# generate_all_reasoning will rewrite reasoning.json internally
res = generate_all_reasoning(preds, {})
print("Done!")
