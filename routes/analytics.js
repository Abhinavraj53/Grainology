import express from 'express';
import ConfirmedSalesOrder from '../models/ConfirmedSalesOrder.js';
import ConfirmedPurchaseOrder from '../models/ConfirmedPurchaseOrder.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All analytics routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Helper: start/end of day in UTC so range matches MongoDB date comparison (transaction_date parses to UTC)
const startOfDay = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setUTCHours(23, 59, 59, 999); return x; };

const getDateRange = (period) => {
  const now = new Date();
  let startDate;
  let endDate = now;

  switch (period) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
    default:
      startDate = new Date('2020-01-01');
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
  }

  startDate = startOfDay(startDate);
  endDate = endOfDay(endDate);
  return { startDate, endDate };
};

// Use booking date (transaction_date from excel) for analytics; fallback to createdAt
const effectiveDateStage = {
  $addFields: {
    _effectiveDate: {
      $ifNull: [
        { $dateFromString: { dateString: '$transaction_date', onError: null, onNull: null } },
        '$createdAt'
      ]
    }
  }
};
const dateMatchStage = (startDate, endDate) => ({ $match: { _effectiveDate: { $gte: startDate, $lte: endDate } } });

// Get time-based analytics (Daily/Weekly/Monthly trends)
router.get('/time-based', async (req, res) => {
  try {
    const { period = 'month', groupBy = 'day' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Aggregation for sales orders (by booking date from sheet)
    const salesAggregation = await ConfirmedSalesOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m-%d',
              date: '$_effectiveDate'
            }
          },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
          totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
          avgRate: { $avg: { $ifNull: ['$rate_per_mt', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Aggregation for purchase orders (by booking date from sheet)
    const purchaseAggregation = await ConfirmedPurchaseOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m-%d',
              date: '$_effectiveDate'
            }
          },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
          totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
          avgRate: { $avg: { $ifNull: ['$rate_per_mt', 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Combine data for trends
    const allDates = new Set([
      ...salesAggregation.map(s => s._id),
      ...purchaseAggregation.map(p => p._id)
    ]);

    const trends = Array.from(allDates).sort().map(date => {
      const salesData = salesAggregation.find(s => s._id === date) || { totalOrders: 0, totalAmount: 0, totalWeight: 0 };
      const purchaseData = purchaseAggregation.find(p => p._id === date) || { totalOrders: 0, totalAmount: 0, totalWeight: 0 };
      
      return {
        date,
        salesOrders: salesData.totalOrders,
        salesAmount: Math.round(salesData.totalAmount * 100) / 100,
        salesWeight: Math.round(salesData.totalWeight * 1000) / 1000,
        purchaseOrders: purchaseData.totalOrders,
        purchaseAmount: Math.round(purchaseData.totalAmount * 100) / 100,
        purchaseWeight: Math.round(purchaseData.totalWeight * 1000) / 1000,
        totalOrders: salesData.totalOrders + purchaseData.totalOrders,
        totalAmount: Math.round((salesData.totalAmount + purchaseData.totalAmount) * 100) / 100
      };
    });

    // Monthly heatmap data (by booking date)
    const heatmapData = await ConfirmedSalesOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: {
            month: { $month: '$_effectiveDate' },
            dayOfWeek: { $dayOfWeek: '$_effectiveDate' }
          },
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$net_amount', 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      trends,
      heatmapData,
      period,
      groupBy
    });
  } catch (error) {
    console.error('Time-based analytics error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch time-based analytics' });
  }
});

// Get commodity analytics
router.get('/commodity', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Commodity distribution for sales (by booking date)
    const salesByCommodity = await ConfirmedSalesOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: '$commodity',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
          totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
          avgRate: { $avg: { $ifNull: ['$rate_per_mt', 0] } },
          minRate: { $min: { $ifNull: ['$rate_per_mt', 0] } },
          maxRate: { $max: { $ifNull: ['$rate_per_mt', 0] } }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Commodity distribution for purchases (by booking date)
    const purchaseByCommodity = await ConfirmedPurchaseOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: '$commodity',
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
          totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
          avgRate: { $avg: { $ifNull: ['$rate_per_mt', 0] } },
          minRate: { $min: { $ifNull: ['$rate_per_mt', 0] } },
          maxRate: { $max: { $ifNull: ['$rate_per_mt', 0] } }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Variety breakdown (by booking date)
    const varietyBreakdown = await ConfirmedSalesOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: { commodity: '$commodity', variety: '$variety' },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
          totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Commodity price trends over time (by booking date)
    const priceTrends = await ConfirmedSalesOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$_effectiveDate' } },
            commodity: '$commodity'
          },
          avgRate: { $avg: { $ifNull: ['$rate_per_mt', 0] } }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Transform price trends for charting
    const commodityPriceTrends = {};
    priceTrends.forEach(item => {
      const commodity = item._id.commodity || 'Unknown';
      if (!commodityPriceTrends[commodity]) {
        commodityPriceTrends[commodity] = [];
      }
      commodityPriceTrends[commodity].push({
        date: item._id.date,
        rate: Math.round(item.avgRate * 100) / 100
      });
    });

    res.json({
      success: true,
      salesByCommodity: salesByCommodity.map(c => ({
        commodity: c._id || 'Unknown',
        orders: c.totalOrders,
        amount: Math.round(c.totalAmount * 100) / 100,
        weight: Math.round(c.totalWeight * 1000) / 1000,
        avgRate: Math.round(c.avgRate * 100) / 100,
        minRate: Math.round(c.minRate * 100) / 100,
        maxRate: Math.round(c.maxRate * 100) / 100
      })),
      purchaseByCommodity: purchaseByCommodity.map(c => ({
        commodity: c._id || 'Unknown',
        orders: c.totalOrders,
        amount: Math.round(c.totalAmount * 100) / 100,
        weight: Math.round(c.totalWeight * 1000) / 1000,
        avgRate: Math.round(c.avgRate * 100) / 100,
        minRate: Math.round(c.minRate * 100) / 100,
        maxRate: Math.round(c.maxRate * 100) / 100
      })),
      varietyBreakdown: varietyBreakdown.map(v => ({
        commodity: v._id.commodity || 'Unknown',
        variety: v._id.variety || 'N/A',
        orders: v.totalOrders,
        amount: Math.round(v.totalAmount * 100) / 100,
        weight: Math.round(v.totalWeight * 1000) / 1000
      })),
      priceTrends: commodityPriceTrends
    });
  } catch (error) {
    console.error('Commodity analytics error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch commodity analytics' });
  }
});

// Get customer/seller analytics
router.get('/customer', async (req, res) => {
  try {
    const { period = 'all', type = 'sales' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const Model = type === 'purchase' ? ConfirmedPurchaseOrder : ConfirmedSalesOrder;
    const customerNameField = type === 'purchase' ? 'supplier_name' : 'seller_name';

    // Top customers (Seller/Supplier from sheet - no account required)
    const topCustomers = await Model.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: `$${customerNameField}`,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
          totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
          avgOrderValue: { $avg: { $ifNull: ['$net_amount', 0] } },
          firstOrder: { $min: '$_effectiveDate' },
          lastOrder: { $max: '$_effectiveDate' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // Customer order frequency distribution
    const orderFrequency = await Model.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: `$${customerNameField}`,
          orderCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ['$orderCount', 1] }, then: '1 order' },
                { case: { $lte: ['$orderCount', 5] }, then: '2-5 orders' },
                { case: { $lte: ['$orderCount', 10] }, then: '6-10 orders' },
                { case: { $lte: ['$orderCount', 25] }, then: '11-25 orders' },
                { case: { $lte: ['$orderCount', 50] }, then: '26-50 orders' }
              ],
              default: '50+ orders'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Customer-wise revenue (Seller/Supplier from sheet)
    const customerRevenue = await Model.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: `$${customerNameField}`,
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // New vs returning customers (by booking date)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allCustomersWithOrders = await Model.aggregate([
      effectiveDateStage,
      { $group: { _id: `$${customerNameField}`, firstOrder: { $min: '$_effectiveDate' }, totalOrders: { $sum: 1 } } }
    ]);

    const newCustomers = allCustomersWithOrders.filter(c => c.firstOrder >= thirtyDaysAgo).length;
    const returningCustomers = allCustomersWithOrders.filter(c => c.totalOrders > 1).length;
    const oneTimeCustomers = allCustomersWithOrders.filter(c => c.totalOrders === 1).length;

    res.json({
      success: true,
      topCustomers: topCustomers.map(c => ({
        customerId: c._id,
        customerName: c._id || 'Unknown',
        customerEmail: '',
        totalOrders: c.totalOrders,
        totalAmount: Math.round(c.totalAmount * 100) / 100,
        totalWeight: Math.round(c.totalWeight * 1000) / 1000,
        avgOrderValue: Math.round(c.avgOrderValue * 100) / 100,
        firstOrder: c.firstOrder,
        lastOrder: c.lastOrder
      })),
      orderFrequency: orderFrequency.map(f => ({
        range: f._id,
        count: f.count
      })),
      customerRevenue: customerRevenue.map(c => ({
        customerName: c._id || 'Unknown',
        amount: Math.round(c.totalAmount * 100) / 100
      })),
      customerTypes: {
        new: newCustomers,
        returning: returningCustomers,
        oneTime: oneTimeCustomers,
        total: allCustomersWithOrders.length
      }
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch customer analytics' });
  }
});

// Get comparative analytics (Purchase vs Sales)
router.get('/comparison', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Sales summary (by booking date)
    const salesSummary = await ConfirmedSalesOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
          totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
          totalDeductions: { $sum: { $ifNull: ['$total_deduction', 0] } },
          avgRate: { $avg: { $ifNull: ['$rate_per_mt', 0] } }
        }
      }
    ]);

    // Purchase summary (by booking date)
    const purchaseSummary = await ConfirmedPurchaseOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
          totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
          totalDeductions: { $sum: { $ifNull: ['$total_deduction', 0] } },
          avgRate: { $avg: { $ifNull: ['$rate_per_mt', 0] } }
        }
      }
    ]);

    // Warehouse comparison (by booking date)
    const salesByWarehouse = await ConfirmedSalesOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: '$warehouse_name',
          orders: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$net_amount', 0] } },
          weight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    const purchaseByWarehouse = await ConfirmedPurchaseOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: '$warehouse_name',
          orders: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$net_amount', 0] } },
          weight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    // State-wise comparison (by booking date)
    const salesByState = await ConfirmedSalesOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: '$state',
          orders: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$net_amount', 0] } },
          weight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    const purchaseByState = await ConfirmedPurchaseOrder.aggregate([
      effectiveDateStage,
      dateMatchStage(startDate, endDate),
      {
        $group: {
          _id: '$state',
          orders: { $sum: 1 },
          amount: { $sum: { $ifNull: ['$net_amount', 0] } },
          weight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    // Combine warehouse data for radar chart
    const allWarehouses = new Set([
      ...salesByWarehouse.map(w => w._id),
      ...purchaseByWarehouse.map(w => w._id)
    ]);

    const warehouseComparison = Array.from(allWarehouses).filter(w => w).map(warehouse => {
      const sales = salesByWarehouse.find(w => w._id === warehouse) || { orders: 0, amount: 0, weight: 0 };
      const purchase = purchaseByWarehouse.find(w => w._id === warehouse) || { orders: 0, amount: 0, weight: 0 };
      
      return {
        warehouse: warehouse || 'Unknown',
        salesOrders: sales.orders,
        salesAmount: Math.round(sales.amount * 100) / 100,
        purchaseOrders: purchase.orders,
        purchaseAmount: Math.round(purchase.amount * 100) / 100
      };
    }).slice(0, 10);

    res.json({
      success: true,
      sales: salesSummary[0] || { totalOrders: 0, totalAmount: 0, totalWeight: 0, totalDeductions: 0, avgRate: 0 },
      purchase: purchaseSummary[0] || { totalOrders: 0, totalAmount: 0, totalWeight: 0, totalDeductions: 0, avgRate: 0 },
      warehouseComparison,
      salesByState: salesByState.filter(s => s._id).map(s => ({
        state: s._id || 'Unknown',
        orders: s.orders,
        amount: Math.round(s.amount * 100) / 100,
        weight: Math.round(s.weight * 1000) / 1000
      })),
      purchaseByState: purchaseByState.filter(s => s._id).map(s => ({
        state: s._id || 'Unknown',
        orders: s.orders,
        amount: Math.round(s.amount * 100) / 100,
        weight: Math.round(s.weight * 1000) / 1000
      }))
    });
  } catch (error) {
    console.error('Comparison analytics error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch comparison analytics' });
  }
});

// Get tabular report data
router.get('/reports/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const { period = 'month', page = 1, limit = 50 } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let data = [];
    let total = 0;

    switch (reportType) {
      case 'order-summary':
        // Order Summary Table (by booking date; Customer = Seller/Supplier from sheet)
        const [salesOrdersAgg, purchaseOrdersAgg] = await Promise.all([
          ConfirmedSalesOrder.aggregate([
            effectiveDateStage,
            dateMatchStage(startDate, endDate),
            { $sort: { _effectiveDate: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            { $project: { transaction_date: 1, invoice_number: 1, seller_name: 1, commodity: 1, variety: 1, net_weight_mt: 1, net_amount: 1, _effectiveDate: 1 } }
          ]),
          ConfirmedPurchaseOrder.aggregate([
            effectiveDateStage,
            dateMatchStage(startDate, endDate),
            { $sort: { _effectiveDate: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            { $project: { transaction_date: 1, invoice_number: 1, supplier_name: 1, commodity: 1, variety: 1, net_weight_mt: 1, net_amount: 1, _effectiveDate: 1 } }
          ])
        ]);

        data = [
          ...salesOrdersAgg.map(o => ({
            type: 'Sales',
            date: o.transaction_date || (o._effectiveDate && new Date(o._effectiveDate).toISOString().slice(0, 10)) || 'N/A',
            invoice: o.invoice_number,
            customer: o.seller_name || 'N/A',
            commodity: o.commodity,
            variety: o.variety || 'N/A',
            netWeight: o.net_weight_mt,
            netAmount: o.net_amount
          })),
          ...purchaseOrdersAgg.map(o => ({
            type: 'Purchase',
            date: o.transaction_date || (o._effectiveDate && new Date(o._effectiveDate).toISOString().slice(0, 10)) || 'N/A',
            invoice: o.invoice_number,
            customer: o.supplier_name || 'N/A',
            commodity: o.commodity,
            variety: o.variety || 'N/A',
            netWeight: o.net_weight_mt,
            netAmount: o.net_amount
          }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        const [salesCount, purchaseCount] = await Promise.all([
          ConfirmedSalesOrder.aggregate([effectiveDateStage, dateMatchStage(startDate, endDate), { $count: 'total' }]),
          ConfirmedPurchaseOrder.aggregate([effectiveDateStage, dateMatchStage(startDate, endDate), { $count: 'total' }])
        ]);
        total = (salesCount[0]?.total || 0) + (purchaseCount[0]?.total || 0);
        break;

      case 'daily-transaction':
        // Daily Transaction Report (by booking date from sheet)
        const dailySales = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$_effectiveDate' } },
              salesOrders: { $sum: 1 },
              salesAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
              salesWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
            }
          }
        ]);

        const dailyPurchase = await ConfirmedPurchaseOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$_effectiveDate' } },
              purchaseOrders: { $sum: 1 },
              purchaseAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
              purchaseWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
            }
          }
        ]);

        const allDates = new Set([...dailySales.map(d => d._id), ...dailyPurchase.map(d => d._id)]);
        data = Array.from(allDates).sort().reverse().map(date => {
          const sales = dailySales.find(d => d._id === date) || { salesOrders: 0, salesAmount: 0, salesWeight: 0 };
          const purchase = dailyPurchase.find(d => d._id === date) || { purchaseOrders: 0, purchaseAmount: 0, purchaseWeight: 0 };
          return {
            date,
            totalOrders: sales.salesOrders + purchase.purchaseOrders,
            salesOrders: sales.salesOrders,
            purchaseOrders: purchase.purchaseOrders,
            totalAmount: sales.salesAmount + purchase.purchaseAmount,
            salesAmount: sales.salesAmount,
            purchaseAmount: purchase.purchaseAmount,
            totalWeight: sales.salesWeight + purchase.purchaseWeight
          };
        });
        total = data.length;
        break;

      case 'customer-ledger':
        // Customer Ledger (Customer = Seller from sales + Supplier from purchase; by booking date)
        const salesBySeller = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          { $group: { _id: '$seller_name', totalOrders: { $sum: 1 }, totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } }, totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } } } },
          { $sort: { totalAmount: -1 } }
        ]);
        const purchaseBySupplier = await ConfirmedPurchaseOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          { $group: { _id: '$supplier_name', totalOrders: { $sum: 1 }, totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } }, totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } } } },
          { $sort: { totalAmount: -1 } }
        ]);
        const customerKeys = new Map();
        salesBySeller.forEach(c => { customerKeys.set(c._id || 'Unknown', { customer: c._id || 'Unknown', totalOrders: c.totalOrders, totalAmount: c.totalAmount, totalWeight: c.totalWeight, type: 'Sales' }); });
        purchaseBySupplier.forEach(c => {
          const key = c._id || 'Unknown';
          if (customerKeys.has(key)) {
            const prev = customerKeys.get(key);
            prev.totalOrders += c.totalOrders;
            prev.totalAmount += c.totalAmount;
            prev.totalWeight += c.totalWeight;
            prev.type = 'Sales & Purchase';
          } else customerKeys.set(key, { customer: key, totalOrders: c.totalOrders, totalAmount: c.totalAmount, totalWeight: c.totalWeight, type: 'Purchase' });
        });
        data = Array.from(customerKeys.values()).map(c => ({
          customer: c.customer,
          email: 'N/A',
          totalOrders: c.totalOrders,
          totalAmount: Math.round(c.totalAmount * 100) / 100,
          totalWeight: Math.round(c.totalWeight * 1000) / 1000,
          pending: 0,
          paid: Math.round(c.totalAmount * 100) / 100
        })).sort((a, b) => b.totalAmount - a.totalAmount);
        total = data.length;
        break;

      case 'commodity-price':
        // Commodity Price List (by booking date)
        const commodityPrices = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: { commodity: '$commodity', variety: '$variety' },
              avgRate: { $avg: { $ifNull: ['$rate_per_mt', 0] } },
              minRate: { $min: { $ifNull: ['$rate_per_mt', 0] } },
              maxRate: { $max: { $ifNull: ['$rate_per_mt', 0] } },
              totalOrders: { $sum: 1 },
              totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
            }
          },
          { $sort: { '_id.commodity': 1, '_id.variety': 1 } }
        ]);

        data = commodityPrices.map(c => ({
          commodity: c._id.commodity || 'Unknown',
          variety: c._id.variety || 'N/A',
          avgRate: Math.round(c.avgRate * 100) / 100,
          minRate: Math.round(c.minRate * 100) / 100,
          maxRate: Math.round(c.maxRate * 100) / 100,
          totalOrders: c.totalOrders,
          totalWeight: Math.round(c.totalWeight * 1000) / 1000
        }));
        total = data.length;
        break;

      case 'deduction':
        // Deduction Report (by booking date from sheet)
        const deductionOrders = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          { $sort: { _effectiveDate: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          { $project: { invoice_number: 1, transaction_date: 1, commodity: 1, deduction_amount_hlw: 1, deduction_amount_moi_bdoi: 1, other_deductions: 1, total_deduction: 1, gross_amount: 1, net_amount: 1 } }
        ]);

        data = deductionOrders.map(o => ({
          invoice: o.invoice_number,
          date: o.transaction_date,
          commodity: o.commodity,
          hlwDeduction: o.deduction_amount_hlw || 0,
          moiBdoiDeduction: o.deduction_amount_moi_bdoi || 0,
          otherDeductions: (o.other_deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0),
          totalDeduction: o.total_deduction || 0,
          grossAmount: o.gross_amount || 0,
          netAmount: o.net_amount || 0
        }));
        const deductionCount = await ConfirmedSalesOrder.aggregate([effectiveDateStage, dateMatchStage(startDate, endDate), { $count: 'total' }]);
        total = deductionCount[0]?.total || 0;
        break;

      case 'warehouse-stock':
        // Warehouse Stock Report (by booking date)
        const warehouseIn = await ConfirmedPurchaseOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: { warehouse: '$warehouse_name', commodity: '$commodity' },
              quantityIn: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
              ordersIn: { $sum: 1 }
            }
          }
        ]);

        const warehouseOut = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: { warehouse: '$warehouse_name', commodity: '$commodity' },
              quantityOut: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
              ordersOut: { $sum: 1 }
            }
          }
        ]);

        const warehouseKeys = new Set([
          ...warehouseIn.map(w => `${w._id.warehouse}|${w._id.commodity}`),
          ...warehouseOut.map(w => `${w._id.warehouse}|${w._id.commodity}`)
        ]);

        data = Array.from(warehouseKeys).map(key => {
          const [warehouse, commodity] = key.split('|');
          const inData = warehouseIn.find(w => w._id.warehouse === warehouse && w._id.commodity === commodity) || { quantityIn: 0, ordersIn: 0 };
          const outData = warehouseOut.find(w => w._id.warehouse === warehouse && w._id.commodity === commodity) || { quantityOut: 0, ordersOut: 0 };
          return {
            warehouse: warehouse || 'Unknown',
            commodity: commodity || 'Unknown',
            quantityIn: Math.round(inData.quantityIn * 1000) / 1000,
            quantityOut: Math.round(outData.quantityOut * 1000) / 1000,
            balance: Math.round((inData.quantityIn - outData.quantityOut) * 1000) / 1000,
            ordersIn: inData.ordersIn,
            ordersOut: outData.ordersOut
          };
        }).filter(d => d.warehouse !== 'Unknown');
        total = data.length;
        break;

      case 'vehicle':
        // Vehicle-wise Report (by booking date)
        const vehicleData = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: '$vehicle_no',
              trips: { $sum: 1 },
              totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } },
              totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
              commodities: { $addToSet: '$commodity' }
            }
          },
          { $sort: { totalAmount: -1 } }
        ]);

        data = vehicleData.filter(v => v._id && v._id !== 'N/A').map(v => ({
          vehicleNo: v._id,
          trips: v.trips,
          totalWeight: Math.round(v.totalWeight * 1000) / 1000,
          totalAmount: Math.round(v.totalAmount * 100) / 100,
          commodities: v.commodities.join(', ')
        }));
        total = data.length;
        break;

      case 'quality':
        // Quality Report (by booking date from sheet)
        const qualityOrders = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          { $sort: { _effectiveDate: -1 } },
          { $skip: skip },
          { $limit: parseInt(limit) },
          { $project: { invoice_number: 1, transaction_date: 1, commodity: 1, variety: 1, hlw_wheat: 1, moisture_moi: 1, bdoi: 1, moi_bdoi: 1, total_deduction: 1 } }
        ]);

        data = qualityOrders.map(o => {
          // Calculate quality grade based on parameters
          let grade = 'A';
          const moisture = o.moisture_moi || 0;
          const bdoi = o.bdoi || 0;
          if (moisture > 14 || bdoi > 5) grade = 'B';
          if (moisture > 16 || bdoi > 8) grade = 'C';
          if (moisture > 18 || bdoi > 10) grade = 'D';

          return {
            invoice: o.invoice_number,
            date: o.transaction_date,
            commodity: o.commodity,
            variety: o.variety || 'N/A',
            hlw: o.hlw_wheat || 'N/A',
            moisture: moisture,
            bdoi: bdoi,
            moiBdoi: o.moi_bdoi || 0,
            totalDeduction: o.total_deduction || 0,
            qualityGrade: grade
          };
        });
        const qualityCount = await ConfirmedSalesOrder.aggregate([effectiveDateStage, dateMatchStage(startDate, endDate), { $count: 'total' }]);
        total = qualityCount[0]?.total || 0;
        break;

      case 'state-summary':
        // State-wise Summary (by booking date)
        const stateSales = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: '$state',
              salesOrders: { $sum: 1 },
              salesAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
              salesWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
            }
          }
        ]);

        const statePurchase = await ConfirmedPurchaseOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: '$state',
              purchaseOrders: { $sum: 1 },
              purchaseAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
              purchaseWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
            }
          }
        ]);

        const allStates = new Set([...stateSales.map(s => s._id), ...statePurchase.map(s => s._id)]);
        data = Array.from(allStates).filter(s => s && s !== 'N/A').map(state => {
          const sales = stateSales.find(s => s._id === state) || { salesOrders: 0, salesAmount: 0, salesWeight: 0 };
          const purchase = statePurchase.find(s => s._id === state) || { purchaseOrders: 0, purchaseAmount: 0, purchaseWeight: 0 };
          return {
            state,
            totalOrders: sales.salesOrders + purchase.purchaseOrders,
            salesOrders: sales.salesOrders,
            purchaseOrders: purchase.purchaseOrders,
            totalAmount: Math.round((sales.salesAmount + purchase.purchaseAmount) * 100) / 100,
            salesAmount: Math.round(sales.salesAmount * 100) / 100,
            purchaseAmount: Math.round(purchase.purchaseAmount * 100) / 100,
            totalWeight: Math.round((sales.salesWeight + purchase.purchaseWeight) * 1000) / 1000
          };
        }).sort((a, b) => b.totalAmount - a.totalAmount);
        total = data.length;
        break;

      case 'monthly-pl':
        // Monthly P&L Statement (by booking date from sheet)
        const monthlyData = await ConfirmedSalesOrder.aggregate([
          effectiveDateStage,
          dateMatchStage(startDate, endDate),
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$_effectiveDate' } },
              grossAmount: { $sum: { $ifNull: ['$gross_amount', 0] } },
              totalDeductions: { $sum: { $ifNull: ['$total_deduction', 0] } },
              netAmount: { $sum: { $ifNull: ['$net_amount', 0] } },
              totalOrders: { $sum: 1 },
              totalWeight: { $sum: { $ifNull: ['$net_weight_mt', 0] } }
            }
          },
          { $sort: { _id: -1 } }
        ]);

        data = monthlyData.map((m, index, arr) => {
          const prevMonth = arr[index + 1];
          const growth = prevMonth ? ((m.netAmount - prevMonth.netAmount) / prevMonth.netAmount * 100) : 0;
          return {
            month: m._id,
            grossAmount: Math.round(m.grossAmount * 100) / 100,
            totalDeductions: Math.round(m.totalDeductions * 100) / 100,
            netAmount: Math.round(m.netAmount * 100) / 100,
            totalOrders: m.totalOrders,
            totalWeight: Math.round(m.totalWeight * 1000) / 1000,
            growthPercent: Math.round(growth * 100) / 100
          };
        });
        total = data.length;
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json({
      success: true,
      reportType,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

export default router;
