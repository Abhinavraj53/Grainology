# Grainology Developer Guide

## Purpose

This file is the fastest way to understand the Grainology repo without opening dozens of old notes.

Grainology is a full-stack agricultural marketplace:

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express
- Database: MongoDB with Mongoose
- Auth: JWT
- File storage: Cloudinary
- Email: Brevo

Important reality check: the repo contains many old Markdown notes about Didit, Cashfree KYC, registration rewrites, Railway fixes, and Render fixes. Those notes are useful as history, but the current source of truth is the code. In the current codebase, the live registration path is the simple document-upload flow, not the older Cashfree/Didit flow.

## Where Everything Lives Now

- Consolidated guide: `docs/DEVELOPER_GUIDE.md`
- Archived Markdown notes: `docs/archive/`
- Cashfree public key file still stays here: `keys/cashfree_public_key.pem`

Note: `.github/copilot-instructions.md` was also moved into the archive because the request was to move all `.md` files. If you want GitHub Copilot repo instructions to work again, restore that file back to `.github/copilot-instructions.md`.

## Quick Start

Install and run from the repo root:

```bash
npm install
npm run dev
npm run dev:frontend
```

Useful scripts from `package.json`:

- `npm run dev` - backend via `nodemon server.js`
- `npm run dev:frontend` - Vite frontend
- `npm run dev:all` - backend + frontend together
- `npm run build` - frontend production build
- `npm run seed:users`
- `npm run seed:data`
- `npm run seed:all`

Key env/config files:

- `.env` - backend env used locally
- `.env.local` - frontend env
- `.env.production` - production-oriented values
- `render.yaml` - Render blueprint for backend + frontend

## Current Source Of Truth

If you are new to the repo, open files in this order:

1. `package.json` - scripts and dependency shape
2. `server.js` - backend bootstrap, CORS, Mongo connection, route mounting
3. `src/App.tsx` - frontend route map
4. `src/pages/Register.tsx` - current registration entry
5. `src/components/SimpleRegistration.tsx` - current live registration UI
6. `src/lib/api.js` - browser API client, auth/session logic, table-to-route mapper
7. `src/hooks/useAuth.ts` - session/profile loading and logout behavior
8. `routes/auth.js` and `routes/registration.js` - auth + registration backend logic
9. `models/User.js` - user schema, approval state, uploaded docs, password handling

## High-Level Architecture

### Frontend

- Entry: `src/main.tsx`
- App router: `src/App.tsx`
- Public routes:
  - `/` landing page
  - `/about`
  - `/services`
  - `/features`
  - `/contact`
  - `/login`
  - `/register`
  - `/kyc-callback`
- Protected route:
  - `/dashboard`

Role split in `src/App.tsx`:

- `admin` and `super_admin` -> `src/components/AdminPanel.tsx`
- Everyone else -> `src/components/CustomerPanel.tsx`

### Backend

- Entry: `server.js`
- Health endpoint: `/health`
- API base: `/api/*`
- MongoDB reconnect behavior:
  - the server does not crash if DB is unavailable
  - DB-backed routes return `503` until reconnect succeeds

### API client pattern

`src/lib/api.js` is important because it does two jobs:

- Normal JWT API calls such as `/auth/session`, `/registration/register`, `/admin/stats`
- A compatibility wrapper `api.from(...)` that lets older UI code use Supabase-like query syntax while actually calling Express routes

That means parts of the UI still look "Supabase style", but runtime behavior is going through the backend API.

## Frontend File Map

### Top-level app flow

- `src/main.tsx` - mounts the React app
- `src/App.tsx` - route definitions, protected/auth-only route wrappers
- `src/hooks/useAuth.ts` - session bootstrap, profile fetch, logout cleanup
- `src/lib/api.js` - API client, retry logic, auth sync, registration methods
- `src/lib/client.ts` - shared type exports plus re-export of `api`

### Registration and auth

- `src/pages/Register.tsx` - currently renders `SimpleRegistration`
- `src/components/SimpleRegistration.tsx` - current live multi-step registration flow
- `src/pages/Login.tsx` - login page
- `src/pages/KYCCallback.tsx` - callback page for older KYC flows
- `src/components/AuthPage.tsx` - older registration/KYC screen still present in repo but not the live `/register` page
- `src/components/KYCVerification.tsx` - related older verification UI

Current `SimpleRegistration` steps:

1. User details and role selection
2. Choose one or more document types
3. Upload one file for each selected document
4. Email OTP verification if email is provided, otherwise direct confirm/register

### Dashboard shells

- `src/components/AdminPanel.tsx` - admin shell, menu, stats refresh, view switching
- `src/components/CustomerPanel.tsx` - customer shell and customer-side navigation

### Admin modules

Main admin areas live in `src/components/admin/`:

- `EnhancedDashboard.tsx` - KPI/dashboard summary
- `UserManagement.tsx` - approval, rejection, re-entry link flow, document review
- `AllPurchaseOrders.tsx` and `AllSaleOrders.tsx` - admin order visibility
- `ConfirmPurchaseOrderForm.tsx` and `ConfirmSalesOrderForm.tsx` - confirmed order flows
- `AllConfirmedOrders.tsx` - consolidated confirmed order handling
- `CommodityVarietyManagement.tsx` - master data
- `WarehouseManagement.tsx` and `LocationManagement.tsx` - location masters
- `LogisticsProviderManagement.tsx` - logistics provider CRUD
- `SiteSettingsPanel.tsx` - editable public site settings
- `ContactInquiriesPanel.tsx` - contact form submissions
- `analytics/*` - analytics dashboards and report views

### Customer modules

Main customer areas live in `src/components/customer/`:

- `Dashboard.tsx` - customer summary view
- `CreateTrade.tsx` - trade creation entry point
- `PurchaseOrderHistory.tsx`
- `SaleOrderHistory.tsx`
- `ConfirmedOrders.tsx`
- `LogisticsProvidersList.tsx`

### Shared/public UI

- `src/components/LandingPage.tsx`
- `src/components/Navigation.tsx`
- `src/components/Footer.tsx`
- `src/components/MandiBhaav.tsx`
- `src/components/WeatherForecast.tsx`
- `src/components/PublicLogisticsDirectory.tsx`
- `src/components/PlatformSnapshot.tsx`
- `src/components/SiteStatsGrid.tsx`

### Helpers and supporting frontend files

- `src/constants/commodityVarieties.ts`
- `src/constants/qualityParameters.ts`
- `src/contexts/PopupContext.tsx`
- `src/contexts/ToastContext.tsx`
- `src/hooks/useLiveRefresh.ts`
- `src/lib/siteSettings.ts`
- `src/lib/analyticsExport.ts`
- `src/utils/pdfGenerator.ts`
- `src/utils/sampleExcel.ts`
- `src/utils/unitConversion.ts`

## Backend File Map

### App bootstrap

- `server.js` - Express app setup, CORS, DB connection, route mounting, error handling
- `config/database.js` - DB-related config support
- `middleware/auth.js` - JWT auth, DB availability checks, role guards
- `middleware/upload.js` - upload middleware support

### Most important route files

- `routes/auth.js`
  - signup
  - signin
  - session
  - current user
  - duplicate-user checks
- `routes/registration.js`
  - send email OTP
  - document options
  - new registration submit
  - rejected-user re-entry
- `routes/admin.js`
  - admin stats
  - user listing
  - approve/reject logic
  - re-entry link generation
  - document viewing endpoints
- `routes/adminOrders.js`
  - admin-created trade/purchase/sale order helpers
- `routes/analytics.js`
  - time, commodity, customer, comparison, report endpoints

### Domain route groups

- `routes/offers.js` - marketplace offers
- `routes/orders.js` - core orders
- `routes/purchaseOrders.js` - purchase orders
- `routes/saleOrders.js` - sale orders
- `routes/confirmedPurchaseOrders.js` - confirmed purchase orders including bulk upload
- `routes/confirmedSalesOrders.js` - confirmed sales orders including bulk upload
- `routes/commodityMaster.js` - commodity master CRUD + approval
- `routes/varietyMaster.js` - variety master CRUD + approval
- `routes/locationMaster.js` - location master CRUD + approval
- `routes/warehouseMaster.js` - warehouse master CRUD + approval
- `routes/supplyTransactions.js` - supply transaction CRUD and stats
- `routes/logistics.js` - logistics providers/public filters
- `routes/logisticsShipments.js` - shipment records
- `routes/mandi.js` - mandi pricing, filters, live/agmarknet-related access
- `routes/weather.js` - forecast/current/state-district/location weather APIs
- `routes/reports.js` - report records
- `routes/uploads.js` - file upload endpoints and sample file download
- `routes/siteSettings.js` - public site settings read/update
- `routes/contactInquiries.js` - contact form create/list
- `routes/documentView.js` - document view endpoint
- `routes/profiles.js` - profile read/update endpoints

### KYC-related reality

These files exist:

- `routes/cashfreeKYC.js`
- `routes/sandboxKYC.js`
- `routes/kyc.js`
- `lib/cashfree.js`
- `utils/cashfreeSignature.js`
- `keys/cashfree_public_key.pem`

But in `server.js` the Cashfree and sandbox KYC routes are currently commented out, and `/register` uses the simple registration flow instead. So treat Cashfree/Didit docs and files as historical, partial, or future-facing unless you intentionally re-enable that work.

### Models

Key Mongoose models in `models/`:

- `User.js` - most important model; stores auth, role, approval status, KYC status, uploaded docs, re-entry metadata
- `Offer.js`
- `Order.js`
- `PurchaseOrder.js`
- `SaleOrder.js`
- `ConfirmedPurchaseOrder.js`
- `ConfirmedSalesOrder.js`
- `CommodityMaster.js`
- `VarietyMaster.js`
- `LocationMaster.js`
- `WarehouseMaster.js`
- `LogisticsProvider.js`
- `LogisticsShipment.js`
- `MandiPrice.js`
- `WeatherData.js`
- `SupplyTransaction.js`
- `Report.js`
- `SiteSettings.js`
- `ContactInquiry.js`

### Utilities and integrations

- `utils/cloudinary.js` - lazy-load Cloudinary, upload/delete helpers
- `utils/brevo.js` - email sending, OTP email, approval/waiting emails
- `utils/otp.js` - OTP generation/storage/verification
- `utils/reentryToken.js` - rejected registration re-entry tokens/URLs
- `utils/passwordVault.js` - encrypted original password support for admin flows
- `utils/csvParser.js` and `utils/columnMapper.js` - bulk upload helpers
- `utils/documentViewToken.js` - document-access tokens
- `services/weatherService.js` - weather integration support

### Scripts and data

- `scripts/seedDemoUsers.js` and `scripts/seedDemoData.js` - local seed data
- `scripts/createSuperAdminUser.js` - super admin bootstrap
- `scripts/importSupplyTransactions.js` - import utility
- `scripts/testMongoDB.js` - DB sanity check
- `data/indianStatesDistricts.js` - state/district source data

### Historical Supabase folder

- `supabase/migrations/` contains older migration history and schema evolution
- `supabase/functions/verify-kyc/index.ts` contains an older function path

Keep this folder as historical reference unless you are actively reviving Supabase-specific flows.

## Current Registration And Approval Flow

This is the current live path inferred from the code:

1. User opens `/register`
2. `src/pages/Register.tsx` renders `SimpleRegistration`
3. User fills role + identity details
4. User selects one or more document types
5. User uploads matching files
6. If email is provided, backend sends OTP through Brevo and user verifies it
7. `routes/registration.js` stores the user with:
   - `kyc_status: 'pending'`
   - `approval_status: 'pending'`
   - uploaded verification docs in Cloudinary
8. Admin reviews the user in `UserManagement`
9. Super Admin approves or rejects
10. If rejected, a re-entry link can be generated and the user can resubmit corrected details

Important implications:

- Mobile number is required
- Email is optional, but if given it triggers OTP flow
- Approval is mandatory before real access
- Multiple document uploads are supported
- Re-entry is a first-class flow for rejected registrations

## Deployment And Infra Notes

### Render

Render is the clearest active deployment path in the repo:

- `render.yaml` defines both backend and frontend services
- frontend is a static Vite build
- SPA rewrite to `index.html` is configured
- backend expects secrets like `MONGODB_URI`, `JWT_SECRET`, and Brevo credentials

### Railway

There are multiple Railway docs in the archive. Treat them as historical deployment notes, not the current default.

### Common production dependencies

- MongoDB Atlas or other reachable Mongo instance
- Cloudinary for uploaded docs
- Brevo for OTP/approval emails
- Correct `FRONTEND_URL` and `VITE_API_URL`

## Archived Markdown Map

All old Markdown files were moved to `docs/archive/`. Use the groups below when you need historical context.

### 1. Core project and local setup

- `docs/archive/README.md` - main project intro, stack, and original quick start
- `docs/archive/BACKEND_README.md` - backend-specific setup notes
- `docs/archive/START_LOCALHOST.md` - local dev startup instructions
- `docs/archive/SETUP_LOCALHOST.md` - localhost setup with env guidance
- `docs/archive/LOCALHOST_SETUP_COMPLETE.md` - confirmation-style local setup note
- `docs/archive/MIGRATION_GUIDE.md` - Supabase to Node/Mongo migration notes
- `docs/archive/MONGODB_SETUP.md` - MongoDB setup troubleshooting
- `docs/archive/UPDATE_MONGODB_URL.md` - move from local Mongo URL to Atlas
- `docs/archive/TEST_CREDENTIALS.md` - demo/test login accounts

### 2. Registration, auth, KYC, Cashfree, Didit history

- `docs/archive/AADHAAR_VERIFICATION_FIX.md` - Aadhaar verification bug summary
- `docs/archive/AUTHPAGE_IMPLEMENTATION_PLAN.md` - old 5-step AuthPage rewrite plan
- `docs/archive/CASHFREE_IMPLEMENTATION_PLAN.md` - Cashfree implementation plan
- `docs/archive/CASHFREE_IP_WHITELISTING_FIX.md` - Cashfree IP whitelist help
- `docs/archive/CASHFREE_SIGNATURE_FIX.md` - Cashfree auth/signature setup
- `docs/archive/COMPLETE_IMPLEMENTATION_GUIDE.md` - combined Cashfree migration guide
- `docs/archive/COMPLETE_IMPLEMENTATION_PLAN.md` - combined implementation plan
- `docs/archive/CURRENT_STATUS.md` - registration rewrite status snapshot
- `docs/archive/DIDIT_CALLBACK_URL_SETUP.md` - Didit webhook/callback notes
- `docs/archive/DIDIT_INTEGRATION.md` - Didit integration overview
- `docs/archive/DIDIT_SETUP_GUIDE.md` - Didit setup guide
- `docs/archive/DIGILOCKER_FIX_SUMMARY.md` - DigiLocker verification fix summary
- `docs/archive/FINAL_IMPLEMENTATION_STATUS.md` - implementation progress snapshot
- `docs/archive/FRONTEND_INTEGRATION_SUMMARY.md` - simple registration frontend integration summary
- `docs/archive/FRONTEND_REGISTRATION_FIX.md` - "new registration already implemented" note
- `docs/archive/IMMEDIATE_FIX_NEEDED.md` - urgent old registration-flow change note
- `docs/archive/IMPLEMENTATION_COMPLETE_STATUS.md` - backend done/frontend pending status note
- `docs/archive/IMPLEMENTATION_STATUS.md` - current status for Cashfree integration
- `docs/archive/IMPLEMENTATION_SUMMARY.md` - summary of Cashfree integration work
- `docs/archive/NEXT_STEPS.md` - pending steps for Cashfree implementation
- `docs/archive/REGISTRATION_FLOW_FIXES.md` - fixes to older step validation/flow
- `docs/archive/SIMPLE_REGISTRATION_GUIDE.md` - simple registration implementation explanation
- `docs/archive/VERIFICATION_TROUBLESHOOTING.md` - KYC verification troubleshooting
- `docs/archive/WHAT_WILL_CHANGE.md` - old-vs-new registration flow comparison
- `docs/archive/FIXED_AUTH_401_ERROR.md` - incorrect credentials issue explanation
- `docs/archive/API_STATUS.md` - API health/status snapshot during integration work

### 3. Orders, uploads, and operations

- `docs/archive/API_PURCHASE_SALE_ORDERS.md` - purchase/sale order API examples
- `docs/archive/BULK_UPLOAD_FILE_FORMAT.md` - bulk upload template rules
- `docs/archive/CHANGES_SUMMARY_ORDERS.md` - purchase/sale orders redesign summary
- `docs/archive/PURCHASE_SALE_ORDERS_IMPLEMENTATION.md` - order system implementation summary
- `docs/archive/DELETE_CONFIRMED_ORDERS.md` - MongoDB delete commands for confirmed orders
- `docs/archive/MONGODB_DELETE_COMMANDS.md` - same deletion task in shorter form

### 4. Deployment, Render, Railway, and builds

- `docs/archive/FRONTEND_BUILD_SUMMARY.md` - one frontend build result snapshot
- `docs/archive/FRONTEND_RENDER_READY.md` - Render static-site readiness note
- `docs/archive/PRODUCTION_BUILD_SUMMARY.md` - production build output/status
- `docs/archive/RAILWAY_502_FIX_GUIDE.md` - Railway 502 debugging guide
- `docs/archive/RAILWAY_BACKEND_STATUS.md` - Railway backend health snapshot
- `docs/archive/RAILWAY_DEPLOYMENT.md` - Railway deployment guide
- `docs/archive/RAILWAY_DEPLOYMENT_FIX.md` - Railway host binding fix note
- `docs/archive/RENDER_502_ERROR_FIX.md` - Render 502 troubleshooting
- `docs/archive/RENDER_BACKEND_STATUS.md` - Render backend health snapshot
- `docs/archive/RENDER_DEPLOYMENT.md` - Render backend deployment guide
- `docs/archive/RENDER_DEPLOY_FIX.md` - Render Cloudinary/package fix note
- `docs/archive/RENDER_FRONTEND_AND_BACKEND.md` - Render setup for both services
- `docs/archive/CORS_FIX_NOTES.md` - combined CORS and deployment issue notes

### 5. Market-data and domain research

- `docs/archive/MANDI_DATA_SOURCES.md` - external mandi price data source research

### 6. Tooling and special-reference files

- `docs/archive/.github/copilot-instructions.md` - repo guidance originally meant for GitHub Copilot
- `docs/archive/keys/README.md` - explanation of the Cashfree public key file in `keys/`

## Practical Advice For The Next Developer

- Trust code over archived notes.
- Start with `server.js`, `src/App.tsx`, `src/components/SimpleRegistration.tsx`, `routes/registration.js`, and `models/User.js`.
- If you are debugging registration, ignore most Didit/Cashfree notes until you verify whether that path is actually mounted in `server.js`.
- If you are debugging login or approval, inspect `routes/auth.js`, `routes/admin.js`, `src/hooks/useAuth.ts`, and `src/components/admin/UserManagement.tsx`.
- If you are debugging uploads, inspect `routes/registration.js`, `middleware/upload.js`, and `utils/cloudinary.js`.
- If you need deployment context, prefer `render.yaml` and current env files before archived deployment notes.

