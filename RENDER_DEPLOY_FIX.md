# Render deployment – Cloudinary error fix

## Error
```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'cloudinary' imported from .../utils/cloudinary.js
```

## What was changed

1. **Lazy-load Cloudinary**  
   `utils/cloudinary.js` no longer imports `cloudinary` at load time. The package is loaded only when a route uses document view/upload. So:
   - The server starts even if the `cloudinary` package is missing.
   - Document view/upload will fail with a clear error until `cloudinary` is installed.

2. **`cloudinary` is in `package.json`**  
   So `npm install` in the repo root will install it.

3. **Render must use the repo root**  
   So that the same `package.json` (and its `node_modules`) is used when running `npm start`.

## Render dashboard settings

- **Root Directory:** leave **empty** (use repo root).  
  If you set a subdirectory (e.g. `backend`), that folder must have its own `package.json` that includes `cloudinary`.
- **Build Command:** `npm install` (or leave default).
- **Start Command:** `npm start`.

## If the error persists

1. **Clear build cache**  
   In Render: Service → **Environment** → **Clear build cache & deploy**.

2. **Confirm root directory**  
   Root Directory must be blank so the service runs from the same directory as the root `package.json`.

3. **Confirm dependency**  
   In the repo root, run:
   ```bash
   npm install
   npm start
   ```
   If that works locally, Render should work with Root Directory left blank and Build Command = `npm install`.
