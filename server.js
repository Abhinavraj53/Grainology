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
import commodityMasterRoutes from './routes/commodityMaster.js';
import warehouseMasterRoutes from './routes/warehouseMaster.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import saleOrderRoutes from './routes/saleOrders.js';
import confirmedSalesOrderRoutes from './routes/confirmedSalesOrders.js';
import confirmedPurchaseOrderRoutes from './routes/confirmedPurchaseOrders.js';
import reportRoutes from './routes/reports.js';
import uploadRoutes from './routes/uploads.js';
import supplyTransactionRoutes from './routes/supplyTransactions.js';
import cashfreeKYCRoutes from './routes/cashfreeKYC.js';
import sandboxKYCRoutes from './routes/sandboxKYC.js';

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
  'https://www.grainologyagri.com',
  'http://grainologyagri.com',
  'http://www.grainologyagri.com'
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

// Log allowed origins on startup
console.log('🌐 CORS Allowed Origins:', allowedOrigins);

// Enhanced CORS configuration - ALLOW ALL ORIGINS (including grainologyagri.com)
const corsOptions = {
  origin: (origin, callback) => {
    // Log all CORS requests for debugging
    console.log(`🌐 CORS Request from origin: ${origin || 'no origin header'}`);
    console.log(`   Allowed origins list: ${allowedOrigins.join(', ')}`);
    console.log(`   FRONTEND_URL env: ${process.env.FRONTEND_URL || 'not set'}`);
    
    // ALWAYS allow the request - no restrictions
    // This ensures grainologyagri.com and all other origins work
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware FIRST (before any other middleware)
app.use(cors(corsOptions));

// Additional explicit CORS headers middleware (CRITICAL - runs on EVERY request)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // CRITICAL: ALWAYS set CORS headers on EVERY request, no exceptions
  if (origin) {
    // Set the exact origin that made the request (required when credentials: true)
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    console.log(`✅ CORS headers set for origin: ${origin} on ${req.method} ${req.path}`);
  } else {
    // No origin header (e.g., Postman, curl) - allow from any
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  // Set all required CORS headers
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    console.log(`✅ Preflight OPTIONS request handled for: ${origin || 'no origin'} on ${req.path}`);
    return res.sendStatus(204);
  }
  
  next();
});

// Body parsing middleware (must come after CORS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Health check endpoint (with CORS headers)
app.get('/health', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.json({ status: 'ok', message: 'Grainology API is running' });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  const origin = req.headers.origin;
  res.json({ 
    status: 'ok', 
    message: 'CORS is working',
    origin: origin || 'no origin header',
    timestamp: new Date().toISOString()
  });
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
app.use('/api/commodity-master', commodityMasterRoutes);
app.use('/api/warehouse-master', warehouseMasterRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/sale-orders', saleOrderRoutes);
app.use('/api/confirmed-sales-orders', confirmedSalesOrderRoutes);
app.use('/api/confirmed-purchase-orders', confirmedPurchaseOrderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/supply-transactions', supplyTransactionRoutes);
app.use('/api/cashfree/kyc', cashfreeKYCRoutes);
app.use('/api/sandbox/kyc', sandboxKYCRoutes);

// Error handling middleware (must preserve CORS headers)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // ALWAYS set CORS headers on errors
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler (must also set CORS headers)
app.use((req, res) => {
  // ALWAYS set CORS headers on 404
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  res.status(404).json({ error: 'Route not found' });
});

// Railway requires binding to 0.0.0.0, not just localhost
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📡 API available at http://${HOST}:${PORT}/api`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
});

