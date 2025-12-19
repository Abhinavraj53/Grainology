# Purchase Orders & Sale Orders - Implementation Summary

## Overview
The purchase order and sale order system has been redesigned to be more efficient and user-focused:

- **Create Trade (Single Form)**: One unified form for both buying and selling
- **Purchase Order History**: Read-only view showing all customer's buy orders
- **Sale Order History**: Read-only view showing all customer's sell orders
- **Admin View**: Admins can see ALL purchase and sale orders from all users

---

## Customer Flow

### 1. Creating a Trade (Buy or Sell)
**Location**: Customer Panel → "Create Trade"

**Features**:
- Toggle between "I want to Buy" and "I want to Sell"
- Single form with fields:
  - Commodity selection
  - Variety selection
  - Quantity (in MT/QTL)
  - Price per quintal
  - Delivery location
  - Payment terms
  - Quality specifications
  - Delivery timeline
  - Additional notes

**What Happens**:
- When user selects "I want to Buy" → Creates a **Purchase Order** (stored in `purchase_orders` collection)
- When user selects "I want to Sell" → Creates a **Sale Order** (stored in `sale_orders` collection)
- The order is immediately visible to admins

---

### 2. Viewing Purchase Orders (Buyer's View)
**Location**: Customer Panel → "Purchase Order"

**Features**:
- Shows all purchase orders created by the logged-in user
- Table view with columns:
  - Commodity
  - Variety
  - Quantity
  - Expected Price
  - Payment Terms
  - Order Status
  - Creation Date
- Click "View" to see full order details in a modal
- **Read-only** - No editing from customer side (future: editable before confirmation)

---

### 3. Viewing Sale Orders (Seller's View)
**Location**: Customer Panel → "Sale Order"

**Features**:
- Shows all sale orders created by the logged-in user
- Table view with columns:
  - Commodity
  - Variety
  - Quantity
  - Price per quintal
  - Payment Terms
  - Order Status
  - Creation Date
- Click "View" to see full order details in a modal
- **Read-only** - No editing from customer side (future: editable before confirmation)

---

## Admin Flow

### 1. All Purchase Orders
**Location**: Admin Panel → "All Purchase Orders"

**Features**:
- View ALL purchase orders from ALL users
- Table shows:
  - Buyer name & email
  - Commodity & variety
  - Quantity
  - Expected price
  - Payment terms
  - Order status
  - Creation date
- Filter by status (All, Open, In Negotiation, Confirmed, Completed, Cancelled)
- Refresh button to reload data
- Shows count of filtered orders

---

### 2. All Sale Orders
**Location**: Admin Panel → "All Sale Orders"

**Features**:
- View ALL sale orders from ALL users
- Table shows:
  - Seller name & email
  - Commodity & variety
  - Quantity
  - Price per quintal
  - Payment terms
  - Order status
  - Creation date
- Filter by status (All, Open, In Negotiation, Confirmed, Completed, Cancelled)
- Refresh button to reload data
- Shows count of filtered orders

---

## Backend API Endpoints

### Purchase Orders

```
GET  /api/purchase-orders                    - List orders (filtered by user role)
GET  /api/purchase-orders?buyer_id=<id>     - Get specific buyer's orders
POST /api/purchase-orders                    - Create new purchase order
PUT  /api/purchase-orders/:id                - Update purchase order
```

**Request Body** (POST/PUT):
```json
{
  "commodity": "Paddy",
  "variety": "Basmati",
  "quantity_mt": 10,
  "expected_price_per_quintal": 2500,
  "delivery_location": "Delhi",
  "payment_terms": "Against Delivery",
  "quality_requirements": {},
  "delivery_timeline_days": 7,
  "notes": "Additional requirements"
}
```

### Sale Orders

```
GET  /api/sale-orders                        - List orders (filtered by user role)
GET  /api/sale-orders?seller_id=<id>        - Get specific seller's orders
POST /api/sale-orders                        - Create new sale order
PUT  /api/sale-orders/:id                    - Update sale order
```

**Request Body** (POST/PUT):
```json
{
  "commodity": "Paddy",
  "variety": "Basmati",
  "quantity_mt": 10,
  "price_per_quintal": 2500,
  "delivery_location": "Delhi",
  "payment_terms": "Against Delivery",
  "quality_report": {},
  "delivery_timeline_days": 7,
  "notes": "Quality specifications"
}
```

---

## Data Flow

```
User Creates Trade
       ↓
"I want to Buy" ─→ POST /api/purchase-orders (buyer_id = user.id)
"I want to Sell" → POST /api/sale-orders (seller_id = user.id)
       ↓
Data saved in MongoDB
       ↓
Visible to:
  ├─ Customer: In their Purchase/Sale Order pages
  └─ Admin: In All Purchase/Sale Orders pages
```

---

## Status Values

Orders can have the following statuses:
- **Open**: Newly created, awaiting responses
- **In Negotiation**: Being discussed between parties
- **Confirmed**: Agreement reached
- **Completed**: Delivery completed
- **Cancelled**: Order was cancelled

---

## Access Control

### Customers
- ✅ Can create purchase orders (I want to Buy)
- ✅ Can create sale orders (I want to Sell)
- ✅ Can view ONLY their own orders
- ❌ Cannot edit orders after creation
- ❌ Cannot see other users' orders

### Admins
- ✅ Can see ALL purchase orders from ALL users
- ✅ Can see ALL sale orders from ALL users
- ✅ Can filter by status
- ✅ Can view order details
- 🔄 Can update order status (future feature)

---

## Frontend Components

### Customer Components
- `src/components/customer/CreateTrade.tsx` - Unified buy/sell form
- `src/components/customer/PurchaseOrderHistory.tsx` - Read-only purchase order history
- `src/components/customer/SaleOrderHistory.tsx` - Read-only sale order history

### Admin Components
- `src/components/admin/AllPurchaseOrders.tsx` - All purchase orders view
- `src/components/admin/AllSaleOrders.tsx` - All sale orders view

---

## Future Enhancements

1. **Order Matching**: Automatically match purchase and sale orders
2. **Negotiations**: Allow back-and-forth price/quantity negotiations
3. **Order Tracking**: Real-time status updates
4. **Notifications**: Alert users when orders are matched or status changes
5. **Order History**: Archive and view past orders
6. **Analytics**: Dashboard showing trends and statistics
7. **Integration**: Connect with logistics and payment systems

---

## Testing the System

### As a Customer:
1. Login as any non-admin user
2. Go to "Create Trade"
3. Toggle between "I want to Buy" and "I want to Sell"
4. Fill in the form and submit
5. Check "Purchase Order" or "Sale Order" tabs to see your orders

### As an Admin:
1. Login as an admin user
2. Go to Admin Dashboard
3. Click on "All Purchase Orders" or "All Sale Orders"
4. View all orders from all users
5. Use status filters to narrow down

---

## Notes

- **Old Components Removed**: The old PurchaseOrder.tsx and SaleOrder.tsx (which had extensive forms) have been replaced
- **Unified Interface**: Everything flows through the Create Trade interface
- **Better UX**: Cleaner, simpler user interface focused on task completion
- **Admin Oversight**: Full transparency for administrators
