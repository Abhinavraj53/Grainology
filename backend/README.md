# Grainology Backend API

Node.js/Express backend with MongoDB for Grainology Digital Agri-Marketplace.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 3001)

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Run the server:
```bash
# Development
npm run dev

# Production
npm start
```

6. Seed initial data (optional):
```bash
node scripts/seedData.js
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - User logout

### Profiles
- `GET /api/profiles` - Get all profiles
- `GET /api/profiles/:id` - Get profile by ID
- `PUT /api/profiles/:id` - Update profile

### Offers
- `GET /api/offers` - Get all offers
- `POST /api/offers` - Create offer
- `PUT /api/offers/:id` - Update offer
- `DELETE /api/offers/:id` - Delete offer

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/finalize` - Finalize order

### Quality Parameters
- `GET /api/quality` - Get all quality parameters
- `POST /api/quality` - Create quality parameter (admin)
- `PUT /api/quality/:id` - Update quality parameter (admin)

### KYC Verification
- `POST /api/kyc/verify` - Verify KYC documents

### Admin
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## Environment Variables

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/grainology
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
# Didit.me KYC Verification Configuration
DIDIT_APP_ID=9e436e07-d8a2-4e4e-8832-fba0e66183e6
DIDIT_API_KEY=uaYe00AVB711Cv_wf1Rky-ZUW4L-_6-fIa9WlNlg8GM
DIDIT_BASE_URL=https://verification.didit.me
DIDIT_WORKFLOW_ID=your-workflow-id-here
```

