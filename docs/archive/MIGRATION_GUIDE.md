# Migration Guide: Supabase to Node.js + MongoDB

This guide explains how to migrate from Supabase to the new Node.js + MongoDB backend.

## Backend Setup

### 1. Install MongoDB

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Windows:**
Download and install from https://www.mongodb.com/try/download/community

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. Seed Initial Data

```bash
node scripts/seedData.js
```

## Frontend Setup

### 1. Update Environment Variables

Create/update `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3001/api
```

### 2. Install Dependencies (if needed)

```bash
npm install
```

### 3. Start Frontend

```bash
npm run dev
```

## API Endpoints

The new backend provides RESTful API endpoints that are compatible with the frontend:

- **Auth**: `/api/auth/*`
- **Profiles**: `/api/profiles/*`
- **Offers**: `/api/offers/*`
- **Orders**: `/api/orders/*`
- **Quality**: `/api/quality/*`
- **KYC**: `/api/kyc/*`
- **Admin**: `/api/admin/*`
- **Mandi**: `/api/mandi/*`
- **Weather**: `/api/weather/*`
- **Logistics**: `/api/logistics/*`

## Key Changes

1. **Authentication**: Uses JWT tokens instead of Supabase sessions
2. **Database**: MongoDB instead of PostgreSQL
3. **API**: RESTful endpoints instead of Supabase client
4. **Frontend**: Compatible API client maintains Supabase-like interface

## Testing

1. Start MongoDB
2. Start backend: `cd backend && npm run dev`
3. Start frontend: `npm run dev`
4. Test authentication and CRUD operations

## Troubleshooting

- **MongoDB not running**: Start MongoDB service
- **Connection errors**: Check MongoDB URI in `.env`
- **Auth errors**: Verify JWT_SECRET is set
- **CORS errors**: Check FRONTEND_URL in backend `.env`

