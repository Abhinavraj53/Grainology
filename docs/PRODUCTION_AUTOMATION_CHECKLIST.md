# Production Automation Checklist

This is the deployment handoff for the Grainology AI price pipeline.

## Required Production Flow

1. Render hosts the backend and frontend.
2. The backend reads the active AI prediction release from Supabase Storage.
3. GitHub Actions runs once daily at 08:00 IST.
4. The daily job checks Agmarknet/Supabase for a newer data date.
5. If no new date is available, the job exits cleanly and the website keeps showing the last active release.
6. If new data is available, the job syncs Agmarknet state data, updates `latest_data.csv`, publishes the Kaggle dataset, runs the Kaggle notebook, validates the release bundle, and activates the new Supabase release.
7. The website keeps using the previous active release until the new release is fully uploaded and activated.

## Render Environment Variables

Set these on the Render backend service. Do not commit real values.

Required:

```text
NODE_ENV=production
MONGODB_URI=...
JWT_SECRET=...
PASSWORD_VIEW_SECRET=...
FRONTEND_URL=https://grainologyagri.com
CORS_ORIGINS=https://grainologyagri.com,https://www.grainologyagri.com
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
AI_PREDICTIONS_SOURCE=supabase_release
AI_PREDICTION_BUCKET=ai-predictions
AI_RELEASE_CACHE_TTL_SECONDS=300
```

Recommended:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-flash-lite-latest
GEMINI_ENABLE_GOOGLE_SEARCH=true
GEMINI_REASONING_CACHE_SECONDS=900
GEMINI_TIMEOUT_MS=30000
MANDI_API_KEY=...
CRON_SECRET=...
BREVO_API_KEY=...
BREVO_FROM_EMAIL=...
BREVO_FROM_NAME=Grainology
```

Set this on the Render frontend static site:

```text
VITE_API_URL=https://<backend-render-url>/api
```

## GitHub Actions Secrets

The daily AI automation needs GitHub repository secrets. These are not committed to GitHub; the tech lead must paste them in repository settings.

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
AI_PREDICTION_BUCKET
KAGGLE_USERNAME
KAGGLE_KEY
KAGGLE_KERNEL_ID
KAGGLE_DATASET_SOURCES
KAGGLE_LATEST_DATASET_ID
```

Example values for Kaggle refs:

```text
KAGGLE_KERNEL_ID=sanjayj23iitk/graninology
KAGGLE_DATASET_SOURCES=khandelwalmanas/daily-commodity-prices-india,sanjayj23iitk/jkailgrainology-latest-data
KAGGLE_LATEST_DATASET_ID=sanjayj23iitk/jkailgrainology-latest-data
```

## Kaggle Non-Interactive Behavior

The automation publishes the latest-data dataset with:

```text
kaggle datasets version --dir-mode zip --quiet
```

and downloads the merge base with:

```text
kaggle datasets download --unzip --force
```

So the production job should not wait for a manual "update/cancel" choice. If a local Kaggle CLI version rejects `--quiet`, set:

```text
KAGGLE_DATASET_VERSION_QUIET=false
```

## Verify After Deploy

Check backend health:

```text
GET https://<backend-render-url>/health
```

Check AI release metadata:

```text
GET https://<backend-render-url>/api/mandi/predictions/v2/meta
```

Expected:

```text
success=true
data.source=supabase_release
data.data_latest_date is not empty
```

Check one forecast:

```text
GET https://<backend-render-url>/api/mandi/predictions/v2?grain=Wheat&state=All%20States
```

Check reasoning:

```text
GET https://<backend-render-url>/api/mandi/predictions/v2/reasoning?grain=Wheat&state=All%20States&horizon=7
```

Check GitHub Actions:

```text
Actions -> AI Auto Refresh -> Run workflow
```

The successful status path should reach:

```text
supabase-release-published
success
```

## Production Safety Notes

- Do not set `AI_PREDICTIONS_SOURCE=local_files` in production unless intentionally falling back.
- If Kaggle training fails, the website keeps showing the old active Supabase release.
- If Agmarknet has no newer date, the job exits without retraining.
- If a generated prediction bundle is older than the active release, publishing is refused.
- Render free web services can sleep, so the GitHub Actions scheduler is the reliable daily automation source.
