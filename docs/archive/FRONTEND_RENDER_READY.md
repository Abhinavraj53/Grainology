# Frontend Render Ready

The frontend is now configured for Render Static Site deployment.

## Updated frontend production setup

- Service type: `Static Site`
- Build command: `npm ci && npm run build`
- Publish directory: `./dist`
- Required env var: `VITE_API_URL=https://grainology-rmg1.onrender.com/api`

## Important SPA routing fix

This project uses React Router with `BrowserRouter`, so Render must rewrite all frontend routes to `index.html`.

That rewrite is now included in [render.yaml](/Users/abhinavraj/Downloads/Grainology/render.yaml):

```yaml
routes:
  - type: rewrite
    source: /*
    destination: /index.html
```

Without this, direct visits to routes like `/about`, `/services`, `/contact`, or `/dashboard` can fail on Render.

## Security and caching

The frontend service also now includes:

- `X-Frame-Options: sameorigin`
- `X-Content-Type-Options: nosniff`
- long-term caching for `/assets/*`

## Render deploy notes

1. Create or sync the Blueprint from `render.yaml`.
2. Deploy `grainology-frontend` as the static service.
3. Keep `VITE_API_URL` pointed to your backend API.
4. On the backend service, set `FRONTEND_URL` to the deployed frontend domain without a trailing slash.

Example:

```env
FRONTEND_URL=https://grainology-frontend.onrender.com
```
