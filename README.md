# Grainology Digital Agri-Marketplace

A comprehensive digital marketplace for agricultural commodities trading.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Authentication**: JWT

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Setup

1. **Clone and install dependencies:**
```bash
npm install
cd backend && npm install && cd ..
```

2. **Start MongoDB:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongodb

# Or use MongoDB Atlas (cloud)
```

3. **Configure environment:**

Create `.env` file (see `.env.example` for template):
```env
# Development
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/grainology
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

# Production (Render.com)
# PORT=10000
# NODE_ENV=production
# MONGODB_URI=your_mongodb_atlas_connection_string
# FRONTEND_URL=https://rareus.store/
```

Create `.env` in root (for frontend):
```env
# Production (Render backend)
VITE_API_URL=https://grainology-rmg1.onrender.com/api

# Local development
# VITE_API_URL=http://localhost:3001/api
```

4. **Seed initial data:**
```bash
cd backend
node scripts/seedData.js
cd ..
```

5. **Start backend:**
```bash
cd backend
npm run dev
```

6. **Start frontend (in new terminal):**
```bash
npm run dev
```

7. **Access application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

## Project Structure

```
Grainology/
├── backend/           # Node.js Express API
│   ├── models/        # MongoDB models
│   ├── routes/        # API routes
│   ├── middleware/    # Auth middleware
│   └── scripts/       # Utility scripts
├── src/               # React frontend
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   └── lib/           # Utilities and API client
└── supabase/          # Legacy Supabase migrations (reference)
```

## Features

- User authentication and authorization
- KYC verification
- Commodity trading (offers and orders)
- Quality parameter management
- Admin dashboard
- Mandi price tracking
- Weather forecasts
- Logistics management
- Purchase and sale orders
- Reports and analytics

## Development

- Frontend dev server: `npm run dev`
- Backend dev server: `cd backend && npm run dev`
- Build frontend: `npm run build`
- Type check: `npm run typecheck`

## Environment Variables

See `.env.example` and `backend/.env.example` for required variables.

## License

Private project

