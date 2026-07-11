# Grainology Kaggle Training Package

This folder contains the Kaggle-side state-wise commodity forecasting workflow.

Before pushing:

1. Replace placeholders in `kernel-metadata.json`.
2. Attach the private historical commodity dataset.
3. Add Kaggle Secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
4. Keep reusable logic in `kaggle/src/`; the notebook should orchestrate runs and
   display diagnostics.

The notebook must write a validated release bundle to `/kaggle/working/release/`.
The GitHub workflow downloads that bundle, validates it, uploads it to private
Supabase Storage, and activates the release only after validation succeeds.
