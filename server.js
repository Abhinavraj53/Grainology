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

// -----------------------------
// CORS CONFIG
// -----------------------------

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://grainologyagri.com',
  'https://www.grainologyagri.com',
  process.env.FRONTEND_URL
].filter(Boolean);

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      // allow requests with no origin (mobile apps / curl / postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('❌ Blocked CORS origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// trust render proxy for cookies
app.set('trust proxy', 1);

// handle OPTIONS preflight
app.options('*', cors());

// -----------------------------
// BODY PARSER
// -----------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -----------------------------
// DB CONNECT
// -----------------------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Mongo connected'))
  .catch(err => console.error('Mongo error:', err.message));

// -----------------------------
// HEALTH CHECK
// -----------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// -----------------------------
// API ROUTES
// -----------------------------
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

// -----------------------------
// ERROR HANDLER
// -----------------------------
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// -----------------------------
// 404
// -----------------------------
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// -----------------------------
// START SERVER
// -----------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on ${PORT}`);
});
