# Kaggle Automation Runbook

## Source Of Truth

Kaggle is the source of truth for model code and experimentation.

This repository should not be used as the daily place to edit model logic. The
Grainology app only needs a stable release contract:

```text
Kaggle trains model and writes /kaggle/working/release/*.json
        ->
GitHub Action downloads latest Kaggle output through Kaggle API
        ->
Bundle is validated and published to Supabase Storage
        ->
Backend serves active release to dashboard
```

The `kaggle/` folder in this repo is now a reference/template and contract aid.
Do not rely on GitHub Actions to push or overwrite Kaggle notebook code.

## Step 1: Apply Supabase Migration

This creates the permanent actual-history table, release tracking tables, private
storage bucket, and activation RPC. It is required before backfill or publishing.

1. Open Supabase Dashboard.
2. Select the Grainology project.
3. Go to SQL Editor.
4. Create a new query.
5. Paste the full contents of:

```text
supabase/migrations/20260708_ai_prediction_architecture.sql
```

6. Run the query.

Verify with:

```sql
select
  to_regclass('public.agmarknet_ai_actuals') as actuals_table,
  to_regclass('public.ai_prediction_runs') as runs_table,
  to_regclass('public.ai_prediction_releases') as releases_table;
```

Expected result: all three columns are non-null table names.

Then verify the private bucket:

```sql
select id, name, public
from storage.buckets
where id = 'ai-predictions';
```

Expected result: one row with `public = false`.

## One-Time Setup

1. Apply `supabase/migrations/20260708_ai_prediction_architecture.sql` manually.
2. Confirm private Supabase Storage bucket `ai-predictions` exists.
3. Create a private Kaggle dataset with the historical yearly Parquet or CSV files.
4. Update `kaggle/kernel-metadata.json` with the real Kaggle username, kernel id,
   and private dataset slug.
5. Add Kaggle Secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
6. Add GitHub Actions secrets:
   - `KAGGLE_USERNAME`
   - `KAGGLE_KEY`
   - `KAGGLE_KERNEL_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `AI_PREDICTION_BUCKET`

## Backfill

Run a dry run first:

```bash
node scripts/backfillAiActualsFromCache.js --dry-run
```

Apply only after counts look reasonable:

```bash
node scripts/backfillAiActualsFromCache.js --apply
```

Verify:

```sql
select grain, state_name, count(*) as rows, max(date) as latest_date
from public.agmarknet_ai_actuals
group by grain, state_name
order by state_name, grain;
```

State names must be real names such as `All States`, `Bihar`, `Rajasthan`.
Do not continue if state names are numeric IDs or `Unknown`.

## Step 3: Kaggle Setup

The app does not train models. Kaggle trains models and emits release files.
You can edit model logic directly in Kaggle.

### Kaggle Dataset

Create or verify these private Kaggle datasets:

1. Historical data dataset:
   - Current metadata expects: `jkail/daily-commodity-prices-india`
   - Should contain yearly files such as `parquet/2001.parquet ... 2026.parquet`
   - CSV yearly files are also supported.
2. Optional bridge/latest dataset:
   - Current metadata expects: `jkail/grainology-latest-data`
   - Should contain `latest_data.csv` if available.

If the actual dataset slugs are different, update:

```text
kaggle/kernel-metadata.json
```

### Kaggle Notebook

Create or verify a private Kaggle notebook with this metadata:

```json
{
  "id": "jkail/grainology-state-price-forecast",
  "title": "Grainology State Price Forecast",
  "code_file": "grainology_state_forecaster.ipynb",
  "language": "python",
  "kernel_type": "notebook",
  "is_private": true,
  "enable_gpu": true,
  "enable_internet": true
}
```

### Kaggle Secrets

In the Kaggle notebook, add these Secrets:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

Do not paste these values into notebook cells.

### Kaggle Notebook Contract

Your Kaggle notebook can have any internal model logic you want, as long as it
writes the expected release bundle.

In Kaggle:

1. Open notebook `jkail/grainology-state-price-forecast`.
2. Edit model code there directly.
3. Confirm the datasets shown in the right sidebar include:
   - `jkail/grainology-latest-data`
   - historical commodity dataset with `csv/` and/or `parquet/`
4. Confirm notebook Secrets include:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
5. For now, run the Kaggle notebook manually while improving the model. Do not
   enable automatic GitHub publishing until the forecast quality is acceptable.
6. Run it manually once after major model changes.

The notebook must produce:

```text
/kaggle/working/release/manifest.json
/kaggle/working/release/predictions.json
/kaggle/working/release/actuals.json
/kaggle/working/release/forecast_series.json
/kaggle/working/release/historical_efficiency.json
/kaggle/working/release/reasoning.json
/kaggle/working/release/states.json
/kaggle/working/release/metrics.json
/kaggle/working/release/canonical_daily.parquet
/kaggle/working/release/canonical_daily.csv
```

The final cell should display a manifest with:

```text
status: success
model_mode: global_state_aware
horizons: [7, 30, 90]
states: includes All States and state names
```

### Improving The Model

Edit these things in Kaggle, not in the Grainology app:

- feature engineering
- model type and hyperparameters
- validation strategy
- baseline/gating logic
- state-wise fallback rules
- reasoning text generation
- efficiency/backtest series generation

Keep the output filenames and JSON structure stable. The website depends on that
contract, not on the internal model implementation.

## Step 4: Publish Kaggle Output

GitHub Actions workflow `.github/workflows/kaggle-ai-daily.yml` does not push
model code to Kaggle. It only:

1. Downloads latest output from `KAGGLE_KERNEL_ID`.
2. Validates the release bundle.
3. Uploads files to Supabase Storage.
4. Activates the release.

For now, GitHub automatic publishing is intentionally disabled. Use local files
while model logic is still changing:

```text
AI_PREDICTIONS_SOURCE=local_files
```

When the model is ready for production, enable a morning GitHub schedule after
the Kaggle notebook has finished. Example for 08:00 IST:

```yaml
schedule:
  - cron: '30 2 * * *'
```

At that point, switch production backend env to:

```text
AI_PREDICTIONS_SOURCE=supabase_release
```

If the Kaggle output is already active, the publisher exits as a clean no-op. If
you rerun the model with a new `run_id`, GitHub can publish it even when the
underlying `data_latest_date` is unchanged.

## Step 5: Local Verification Before Deploy

Before publishing or switching production to Supabase releases, test the Kaggle
bundle locally.

1. Download the Kaggle output bundle.
2. Put the release files into a local folder such as:

```text
staging/
```

The folder must contain `manifest.json`, `predictions.json`, `actuals.json`,
`forecast_series.json`, `historical_efficiency.json`, `backtest.json`,
`reasoning.json`, `states.json`, `metrics.json`, `canonical_daily.parquet`,
`canonical_daily.csv`, and `checksums.json`.

3. Install it into the local backend data folder:

```bash
node scripts/installLocalAiRelease.js staging
```

4. Keep local backend source as:

```env
AI_PREDICTIONS_SOURCE=local_files
```

5. Run the backend and frontend locally.

6. Test:

```text
http://localhost:3001/api/mandi/predictions/v2/meta
http://localhost:3001/api/mandi/predictions/v2?grain=Wheat&state=All%20States
http://localhost:3001/api/mandi/predictions/v2/efficiency?grain=Wheat&state=Bihar&horizon=7
```

7. Open the dashboard and verify:

- state dropdown includes clean state names
- changing state changes cards, chart, reasoning, and efficiency graph
- 7/30/90 horizon selector changes the selected forecast and efficiency graph
- no fake duplicate states such as `Keralam` or `Uttrakhand`

## Local 15-Minute Kaggle Sync

While the model is still being improved, keep everything local and use `.env`
instead of GitHub Secrets.

Add these values to local `.env`:

```env
KAGGLE_USERNAME=your-kaggle-username
KAGGLE_KEY=your-kaggle-api-key
KAGGLE_KERNEL_ID=jkail/grainology-state-price-forecast
KAGGLE_DATASET_SOURCES=your-user/daily-commodity-prices-india,your-user/grainology-latest-data
LOCAL_KAGGLE_SYNC_MINUTES=15
AI_PREDICTIONS_SOURCE=local_files
```

`KAGGLE_DATASET_SOURCES` must contain dataset refs that the same Kaggle account
can access. If you run the notebook under `sanjayj23iitk`, datasets owned by
another private account will be rejected by Kaggle unless they are public or
shared with that account.

Install the Kaggle CLI on your machine and make sure `kaggle` works in the
terminal:

```bash
py -m pip install kaggle
kaggle --version
```

Then run one of these:

```bash
npm run ai:sync-local:once
```

or keep it watching:

```bash
npm run ai:sync-local
```

The watcher downloads the latest Kaggle output, validates it through the local
installer, and copies it into:

```text
services/ml-pipeline/dashboard/data/
```

The dashboard refreshes AI prediction data every 15 minutes while open, so it
will pick up the new local release after the watcher updates those files.

## Local Kaggle Run Without Opening Kaggle

To push the local notebook to Kaggle, run it on Kaggle, wait for completion, and
sync the output into the local website data folder:

```bash
npm run ai:kaggle-run
```

This command:

1. Regenerates `kaggle/grainology_state_forecaster.ipynb`.
2. Runs `kaggle kernels push -p kaggle`.
3. Polls `kaggle kernels status`.
4. Downloads the latest output through `npm run ai:sync-local:once`.

Useful local `.env` knobs:

```env
LOCAL_KAGGLE_RUN_POLL_SECONDS=60
LOCAL_KAGGLE_RUN_TIMEOUT_MINUTES=360
```

If you only want to start the Kaggle run and sync later:

```bash
npm run ai:kaggle-run:no-sync
```

## Manual Release Flow

1. Run the Kaggle notebook manually with `FORCE_FULL_REBUILD=true`.
2. Download the output bundle into `staging/`.
3. Validate it:

```bash
python automation/validate_prediction_bundle.py staging
```

4. Publish it:

```bash
python automation/publish_kaggle_release.py --bundle-dir staging
```

5. Set backend env `AI_PREDICTIONS_SOURCE=supabase_release`.

## Rollback

Keep old releases in Storage. To roll back, set the previous release row active
with `activate_ai_prediction_release(<previous_release_id>)` after confirming its
run status is `validated`. Leave `AI_PREDICTIONS_SOURCE=local_files` available as
the emergency fallback.
