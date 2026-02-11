import express from 'express';
import User from '../models/User.js';
import Order from '../models/Order.js';
import { sendWelcomeEmail } from '../utils/brevo.js';
import Offer from '../models/Offer.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import SaleOrder from '../models/SaleOrder.js';
import ConfirmedSalesOrder from '../models/ConfirmedSalesOrder.js';
import ConfirmedPurchaseOrder from '../models/ConfirmedPurchaseOrder.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { createDocumentViewToken } from '../utils/documentViewToken.js';
import { parseCloudinaryUrl, getSignedDeliveryUrl } from '../utils/cloudinary.js';

const router = express.Router();

async function fetchCloudinaryAsset(url) {
  let response = await fetch(url, { method: 'GET' });
  if (response.status === 401) {
    const parsed = parseCloudinaryUrl(url);
    if (parsed) {
      const signedUrl = await getSignedDeliveryUrl(parsed.publicId, parsed.resourceType);
      response = await fetch(signedUrl, { method: 'GET' });
    }
  }
  return response;
}

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalFarmers,
      totalTraders,
      verifiedUsers,
      totalPurchaseOrders,
      totalSaleOrders,
      totalConfirmedSalesOrders,
      totalConfirmedPurchaseOrders
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'trader' }),
      User.countDocuments({ kyc_status: 'verified' }),
      PurchaseOrder.countDocuments(),
      SaleOrder.countDocuments(),
      ConfirmedSalesOrder.countDocuments(),
      ConfirmedPurchaseOrder.countDocuments()
    ]);

    // Calculate total amounts for confirmed orders
    const confirmedSalesOrders = await ConfirmedSalesOrder.find({});
    const confirmedPurchaseOrders = await ConfirmedPurchaseOrder.find({});
    
    const totalConfirmedSalesAmount = confirmedSalesOrders.reduce((sum, order) => {
      const netAmount = order.net_amount;
      // Handle NaN, null, undefined, or invalid values
      if (netAmount === null || netAmount === undefined || isNaN(netAmount) || typeof netAmount !== 'number') {
        // Try to calculate from gross_amount and total_deduction if net_amount is invalid
        const gross = order.gross_amount || 0;
        const deduction = order.total_deduction || 0;
        const calculated = gross - deduction;
        return sum + (isNaN(calculated) ? 0 : calculated);
      }
      return sum + netAmount;
    }, 0);
    
    const totalConfirmedPurchaseAmount = confirmedPurchaseOrders.reduce((sum, order) => {
      const netAmount = order.net_amount;
      // Handle NaN, null, undefined, or invalid values
      if (netAmount === null || netAmount === undefined || isNaN(netAmount) || typeof netAmount !== 'number') {
        // Try to calculate from gross_amount and total_deduction if net_amount is invalid
        const gross = order.gross_amount || 0;
        const deduction = order.total_deduction || 0;
        const calculated = gross - deduction;
        return sum + (isNaN(calculated) ? 0 : calculated);
      }
      return sum + netAmount;
    }, 0);

    res.json({
      totalUsers,
      totalFarmers,
      totalTraders,
      verifiedUsers,
      totalPurchaseOrders,
      totalSaleOrders,
      totalConfirmedSalesOrders,
      totalConfirmedPurchaseOrders,
      totalConfirmedSalesAmount,
      totalConfirmedPurchaseAmount
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

// Dashboard: recent confirmed orders + vendor (seller/supplier) performance from confirmed sales/purchase
router.get('/dashboard', async (req, res) => {
  try {
    const [recentSales, recentPurchase] = await Promise.all([
      ConfirmedSalesOrder.find()
        .select('invoice_number transaction_date commodity seller_name net_weight_mt net_amount createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ConfirmedPurchaseOrder.find()
        .select('invoice_number transaction_date commodity supplier_name net_weight_mt net_amount createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    const recentOrders = [
      ...recentSales.map(o => ({ ...o, orderType: 'sales', partyName: o.seller_name })),
      ...recentPurchase.map(o => ({ ...o, orderType: 'purchase', partyName: o.supplier_name }))
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Vendor performance: group by seller_name (sales) and supplier_name (purchase), order count + total amount
    const salesAgg = await ConfirmedSalesOrder.aggregate([
      { $group: { _id: '$seller_name', totalOrders: { $sum: 1 }, totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } } } },
      { $match: { _id: { $nin: [null, '', 'N/A'] } } }
    ]);
    const purchaseAgg = await ConfirmedPurchaseOrder.aggregate([
      { $group: { _id: '$supplier_name', totalOrders: { $sum: 1 }, totalAmount: { $sum: { $ifNull: ['$net_amount', 0] } } } },
      { $match: { _id: { $nin: [null, '', 'N/A'] } } }
    ]);

    const byParty = new Map();
    salesAgg.forEach(s => {
      const name = s._id || 'Unknown';
      const prev = byParty.get(name) || { totalOrders: 0, totalAmount: 0 };
      byParty.set(name, { name, totalOrders: prev.totalOrders + s.totalOrders, totalAmount: prev.totalAmount + s.totalAmount });
    });
    purchaseAgg.forEach(p => {
      const name = p._id || 'Unknown';
      const prev = byParty.get(name) || { totalOrders: 0, totalAmount: 0 };
      byParty.set(name, { name, totalOrders: prev.totalOrders + p.totalOrders, totalAmount: prev.totalAmount + p.totalAmount });
    });

    const vendorPerformance = Array.from(byParty.values())
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10)
      .map(v => ({ name: v.name, totalOrders: v.totalOrders, totalAmount: v.totalAmount }));

    res.json({ recentOrders, vendorPerformance });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard data' });
  }
});

// Get all users (include view_access for document viewing in admin panel)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    const usersOut = users.map(u => {
      const uu = u.toObject ? u.toObject() : { ...u };
      uu.id = uu._id ? uu._id.toString() : uu._id;
      if (uu.uploaded_document && uu.uploaded_document.view_url) {
        uu.uploaded_document.view_access = createDocumentViewToken(uu.uploaded_document.view_url);
      }
      if (uu.uploaded_documents && Array.isArray(uu.uploaded_documents)) {
        uu.uploaded_documents = uu.uploaded_documents.map(d => ({
          ...d,
          view_access: createDocumentViewToken(d.view_url),
        }));
      }
      return uu;
    });
    res.json(usersOut);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

// Update user (including approval_status; when set to approved, send welcome email if user has email)
router.put('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const wasApproved = req.body.approval_status === 'approved';
    const update = { ...req.body };
    if (wasApproved) {
      update.approved_at = new Date();
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // When admin approves, send welcome/approval email if user has email
    if (wasApproved && user.email) {
      try {
        await sendWelcomeEmail(user.email, user.name);
        console.log(`Approval email sent to ${user.email}`);
      } catch (emailError) {
        console.error('Approval email error:', emailError);
      }
    }

    const out = user.toJSON();
    res.json(out);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Get user verification document(s) – single + full list
router.get('/users/:id/verification-document', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasAnyDoc = (user.uploaded_document && (user.uploaded_document.cloudinary_url || user.uploaded_document.view_url)) ||
      (user.uploaded_documents && user.uploaded_documents.length > 0);
    if (!hasAnyDoc) {
      return res.status(404).json({ error: 'No verification document found for this user' });
    }

    const docList = (user.uploaded_documents && user.uploaded_documents.length)
      ? user.uploaded_documents
      : (user.uploaded_document ? [user.uploaded_document] : []);

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        trade_name: user.trade_name,
        mobile_number: user.mobile_number,
        email: user.email,
        role: user.role,
        kyc_status: user.kyc_status,
        approval_status: user.approval_status,
      },
      document: docList[0] ? {
        document_type: docList[0].document_type,
        view_url: docList[0].view_url,
        view_access: createDocumentViewToken(docList[0].view_url),
        download_url: docList[0].download_url,
        file_name: docList[0].file_name,
        file_size: docList[0].file_size,
        uploaded_at: docList[0].uploaded_at,
      } : null,
      documents: docList.map(d => ({
        document_type: d.document_type,
        view_url: d.view_url,
        view_access: createDocumentViewToken(d.view_url),
        download_url: d.download_url,
        file_name: d.file_name,
        file_size: d.file_size,
        uploaded_at: d.uploaded_at,
      })),
    });
  } catch (error) {
    console.error('Get user verification document error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch verification document' });
  }
});

// Proxy PDF/document for inline viewing (avoids iframe "Failed to load PDF" from Cloudinary)
router.get('/documents/view', async (req, res) => {
  try {
    let url = req.query.url;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing url query' });
    }
    if (!url.startsWith('http')) url = `https://${url}`;
    if (!url.includes('res.cloudinary.com/')) {
      return res.status(400).json({ error: 'Invalid document URL' });
    }
    const response = await fetchCloudinaryAsset(url);
    if (!response.ok) {
      if (response.status === 403) {
        return res.status(403).json({
          error: 'File blocked in Cloudinary',
          message: 'This file is set to "Blocked for delivery" in Cloudinary. In Cloudinary Console → Media Library → open the file → Summary → set Access control to "Public".',
        });
      }
      return res.status(response.status).send(response.statusText);
    }
    let contentType = response.headers.get('content-type') || 'application/octet-stream';
    if (!contentType.includes('pdf')) contentType = 'application/pdf';
    res.setHeader('Content-Type', contentType);
    const asDownload = req.query.download === '1' || req.query.download === 'true';
    const filename = (req.query.filename && typeof req.query.filename === 'string')
      ? req.query.filename.replace(/[^\w\s.-]/gi, '_').replace(/"/g, '').trim() || 'document.pdf'
      : 'document.pdf';
    res.setHeader('Content-Disposition', asDownload ? `attachment; filename="${filename}"` : 'inline; filename="document.pdf"');
    res.setHeader('Cache-Control', 'private, max-age=300');
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Document proxy error:', error);
    res.status(500).json({ error: error.message || 'Failed to load document' });
  }
});

// Get all users with verification documents
router.get('/users-with-documents', async (req, res) => {
  try {
    const users = await User.find({
      'uploaded_document.cloudinary_url': { $exists: true }
    })
    .select('name mobile_number email role kyc_status uploaded_document createdAt')
    .sort({ createdAt: -1 });

    const usersWithDocuments = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      mobile_number: user.mobile_number,
      email: user.email,
      role: user.role,
      kyc_status: user.kyc_status,
      document: user.uploaded_document ? {
        document_type: user.uploaded_document.document_type,
        view_url: user.uploaded_document.view_url,
        view_access: createDocumentViewToken(user.uploaded_document.view_url),
        download_url: user.uploaded_document.download_url,
        file_name: user.uploaded_document.file_name,
        uploaded_at: user.uploaded_document.uploaded_at,
      } : null,
      registered_at: user.createdAt,
    }));

    res.json({
      success: true,
      count: usersWithDocuments.length,
      users: usersWithDocuments,
    });
  } catch (error) {
    console.error('Get users with documents error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users with documents' });
  }
});

export default router;

