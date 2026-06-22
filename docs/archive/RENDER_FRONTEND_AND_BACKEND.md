# Run Frontend and Backend on Render

## 1. Backend (already at https://grainology-rmg1.onrender.com)

- **Service type:** Web Service  
- **Root Directory:** (blank – use repo root)  
- **Build Command:** `npm install`  
- **Start Command:** `npm start`  
- **Environment variables** (in Render Dashboard → Environment):
  - `NODE_ENV` = production
  - `MONGODB_URI` = your MongoDB Atlas URI
  - `JWT_SECRET` = strong secret
  - **Brevo (SMTP):**
    - `BREVO_SMTP_USER` = `a1e08c001@smtp-brevo.com` (or your Brevo SMTP login)
    - `BREVO_SMTP_KEY` = your SMTP key (e.g. `xsmtpsib-...`)
  - `BREVO_FROM_EMAIL` = noreply@grainologyagri.com
  - `BREVO_FROM_NAME` = Grainology
  - `FRONTEND_URL` = **your frontend URL** (e.g. `https://grainology-frontend.onrender.com`) – set this after you create the frontend service so CORS works.

## 2. Frontend (new Static Site)

- **Service type:** Static Site  
- **Root Directory:** (blank)  
- **Build Command:** `npm install && npm run build`  
- **Publish Directory:** `dist`  
- **Environment variables:**
  - `VITE_API_URL` = `https://grainology-rmg1.onrender.com/api`  

Then open the frontend URL Render gives you (e.g. `https://grainology-frontend.onrender.com`).

## 3. Connect them

1. Deploy the frontend once and copy its URL.  
2. In the **backend** service, add or set:  
   `FRONTEND_URL` = `https://<your-frontend-name>.onrender.com`  
   (no trailing slash)  
3. Redeploy the backend so CORS allows the frontend origin.

## 4. Brevo (email)

- **SMTP** (recommended with your key): set `BREVO_SMTP_USER` and `BREVO_SMTP_KEY` on the backend.  
- **API key:** alternatively create an API key under Brevo → API keys & MCP and set `BREVO_API_KEY` (and leave SMTP vars unset if you prefer).

The app uses **SMTP** when `BREVO_SMTP_KEY` is set (smtp-relay.brevo.com:587).
