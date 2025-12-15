import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import offerRoutes from './routes/offers.js';
import orderRoutes from './routes/orders.js';
import qualityRoutes from './routes/quality.js';
import adminRoutes from './routes/admin.js';
import adminOrderRoutes from './routes/adminOrders.js';
import kycRoutes from './routes/kyc.js';
import mandiRoutes from './routes/mandi.js';
import weatherRoutes from './routes/weather.js';
import logisticsRoutes from './routes/logistics.js';
import logisticsShipmentRoutes from './routes/logisticsShipments.js';
import varietyMasterRoutes from './routes/varietyMaster.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import saleOrderRoutes from './routes/saleOrders.js';
import reportRoutes from './routes/reports.js';
import uploadRoutes from './routes/uploads.js';
import supplyTransactionRoutes from './routes/supplyTransactions.js';
import cashfreeKYCRoutes from './routes/cashfreeKYC.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
// Normalize URL - remove trailing slash for CORS matching
const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '');

// Core allowed origins - always include localhost for development
let allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  normalizedFrontendUrl,
  frontendUrl
].filter(Boolean).map(url => url.replace(/\/$/, '')); // Remove duplicates and trailing slashes

// Explicitly add known production frontend domains (with and without www)
const productionOrigins = [
  'https://grainologyagri.com',
  'https://www.grainologyagri.com'
];
productionOrigins.forEach(origin => {
  const normalized = origin.replace(/\/$/, '');
  if (!allowedOrigins.includes(normalized)) {
    allowedOrigins.push(normalized);
  }
});

// Add FRONTEND_URL from env again if somehow different after normalization
if (process.env.FRONTEND_URL) {
  const envFrontend = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(envFrontend)) {
    allowedOrigins.push(envFrontend);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Normalize the origin (remove trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      console.log(`   Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grainology')
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  console.error('⚠️  Server will continue but database operations may fail.');
  console.error('💡 Tip: Check your MongoDB Atlas IP whitelist or connection string');
  // Don't exit - let server start even if DB connection fails
  // This allows testing other endpoints
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Grainology API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/mandi', mandiRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/logistics-shipments', logisticsShipmentRoutes);
app.use('/api/variety-master', varietyMasterRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/sale-orders', saleOrderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/supply-transactions', supplyTransactionRoutes);
app.use('/api/cashfree/kyc', cashfreeKYCRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});

