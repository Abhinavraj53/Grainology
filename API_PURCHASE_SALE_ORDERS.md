# API Query Examples - Purchase & Sale Orders

## Base URL
```
Production: https://grainology.onrender.com/api
Development: http://localhost:3001/api
```

## Authentication
All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## PURCHASE ORDERS API

### 1. Get User's Purchase Orders
```
GET /api/purchase-orders
```

**Response** (Non-Admin User):
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "commodity": "Paddy",
    "variety": "Basmati",
    "quantity_mt": 10,
    "expected_price_per_quintal": 2500,
    "delivery_location": "Delhi NCR",
    "payment_terms": "Against Delivery",
    "status": "Open",
    "buyer_id": "507f1f77bcf86cd799439010",
    "createdAt": "2025-12-19T10:30:00Z",
    "updatedAt": "2025-12-19T10:30:00Z"
  }
]
```

**Response** (Admin User - All Orders):
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "commodity": "Paddy",
    "variety": "Basmati",
    "quantity_mt": 10,
    "expected_price_per_quintal": 2500,
    "delivery_location": "Delhi NCR",
    "payment_terms": "Against Delivery",
    "status": "Open",
    "buyer_id": {
      "id": "507f1f77bcf86cd799439010",
      "name": "Farmer John",
      "email": "john@example.com"
    },
    "createdAt": "2025-12-19T10:30:00Z",
    "updatedAt": "2025-12-19T10:30:00Z"
  }
]
```

---

### 2. Get Specific Buyer's Purchase Orders
```
GET /api/purchase-orders?buyer_id=507f1f77bcf86cd799439010
```

**Response**:
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "commodity": "Paddy",
    "variety": "Basmati",
    "quantity_mt": 10,
    "expected_price_per_quintal": 2500,
    "delivery_location": "Delhi NCR",
    "payment_terms": "Against Delivery",
    "status": "Open",
    "buyer_id": {
      "id": "507f1f77bcf86cd799439010",
      "name": "Farmer John",
      "email": "john@example.com"
    },
    "createdAt": "2025-12-19T10:30:00Z"
  }
]
```

---

### 3. Create Purchase Order
```
POST /api/purchase-orders
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

**Request Body**:
```json
{
  "commodity": "Paddy",
  "variety": "Basmati",
  "quantity_mt": 10,
  "expected_price_per_quintal": 2500,
  "delivery_location": "Delhi NCR",
  "payment_terms": "Against Delivery",
  "quality_requirements": {
    "moisture": "12%",
    "damaged_grains": "2%"
  },
  "delivery_timeline_days": 7,
  "notes": "Looking for premium quality basmati rice"
}
```

**Response** (201 Created):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "commodity": "Paddy",
  "variety": "Basmati",
  "quantity_mt": 10,
  "expected_price_per_quintal": 2500,
  "delivery_location": "Delhi NCR",
  "payment_terms": "Against Delivery",
  "status": "Open",
  "quality_requirements": {
    "moisture": "12%",
    "damaged_grains": "2%"
  },
  "delivery_timeline_days": 7,
  "notes": "Looking for premium quality basmati rice",
  "buyer_id": {
    "id": "507f1f77bcf86cd799439010",
    "name": "Farmer John",
    "email": "john@example.com",
    "mobile_number": "9876543210"
  },
  "createdAt": "2025-12-19T10:30:00Z",
  "updatedAt": "2025-12-19T10:30:00Z"
}
```

---

### 4. Get Single Purchase Order
```
GET /api/purchase-orders/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "commodity": "Paddy",
  "variety": "Basmati",
  "quantity_mt": 10,
  "expected_price_per_quintal": 2500,
  "delivery_location": "Delhi NCR",
  "payment_terms": "Against Delivery",
  "status": "Open",
  "buyer_id": {
    "id": "507f1f77bcf86cd799439010",
    "name": "Farmer John",
    "email": "john@example.com"
  },
  "createdAt": "2025-12-19T10:30:00Z",
  "updatedAt": "2025-12-19T10:30:00Z"
}
```

---

### 5. Update Purchase Order
```
PUT /api/purchase-orders/507f1f77bcf86cd799439011
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

**Request Body** (partial update):
```json
{
  "status": "In Negotiation",
  "expected_price_per_quintal": 2400,
  "notes": "Ready to negotiate on price"
}
```

**Response**:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "commodity": "Paddy",
  "variety": "Basmati",
  "quantity_mt": 10,
  "expected_price_per_quintal": 2400,
  "delivery_location": "Delhi NCR",
  "payment_terms": "Against Delivery",
  "status": "In Negotiation",
  "notes": "Ready to negotiate on price",
  "buyer_id": {
    "id": "507f1f77bcf86cd799439010",
    "name": "Farmer John",
    "email": "john@example.com"
  },
  "createdAt": "2025-12-19T10:30:00Z",
  "updatedAt": "2025-12-19T11:00:00Z"
}
```

---

## SALE ORDERS API

### 1. Get User's Sale Orders
```
GET /api/sale-orders
```

**Response** (Non-Admin User):
```json
[
  {
    "id": "507f1f77bcf86cd799439012",
    "commodity": "Paddy",
    "variety": "Sona Masuri",
    "quantity_mt": 25,
    "price_per_quintal": 2300,
    "delivery_location": "Hyderabad",
    "payment_terms": "T+3 Days",
    "status": "Open",
    "seller_id": "507f1f77bcf86cd799439009",
    "createdAt": "2025-12-19T11:30:00Z",
    "updatedAt": "2025-12-19T11:30:00Z"
  }
]
```

**Response** (Admin User - All Orders):
```json
[
  {
    "id": "507f1f77bcf86cd799439012",
    "commodity": "Paddy",
    "variety": "Sona Masuri",
    "quantity_mt": 25,
    "price_per_quintal": 2300,
    "delivery_location": "Hyderabad",
    "payment_terms": "T+3 Days",
    "status": "Open",
    "seller_id": {
      "id": "507f1f77bcf86cd799439009",
      "name": "Trader Ram",
      "email": "ram@example.com"
    },
    "createdAt": "2025-12-19T11:30:00Z",
    "updatedAt": "2025-12-19T11:30:00Z"
  }
]
```

---

### 2. Get Specific Seller's Sale Orders
```
GET /api/sale-orders?seller_id=507f1f77bcf86cd799439009
```

**Response**:
```json
[
  {
    "id": "507f1f77bcf86cd799439012",
    "commodity": "Paddy",
    "variety": "Sona Masuri",
    "quantity_mt": 25,
    "price_per_quintal": 2300,
    "delivery_location": "Hyderabad",
    "payment_terms": "T+3 Days",
    "status": "Open",
    "seller_id": {
      "id": "507f1f77bcf86cd799439009",
      "name": "Trader Ram",
      "email": "ram@example.com"
    },
    "createdAt": "2025-12-19T11:30:00Z"
  }
]
```

---

### 3. Create Sale Order
```
POST /api/sale-orders
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

**Request Body**:
```json
{
  "commodity": "Paddy",
  "variety": "Sona Masuri",
  "quantity_mt": 25,
  "price_per_quintal": 2300,
  "delivery_location": "Hyderabad",
  "payment_terms": "T+3 Days",
  "quality_report": {
    "moisture": "13%",
    "purity": "98.5%",
    "damaged_grains": "1%"
  },
  "delivery_timeline_days": 5,
  "notes": "Fresh harvest from this season"
}
```

**Response** (201 Created):
```json
{
  "id": "507f1f77bcf86cd799439012",
  "commodity": "Paddy",
  "variety": "Sona Masuri",
  "quantity_mt": 25,
  "price_per_quintal": 2300,
  "delivery_location": "Hyderabad",
  "payment_terms": "T+3 Days",
  "status": "Open",
  "quality_report": {
    "moisture": "13%",
    "purity": "98.5%",
    "damaged_grains": "1%"
  },
  "delivery_timeline_days": 5,
  "notes": "Fresh harvest from this season",
  "seller_id": {
    "id": "507f1f77bcf86cd799439009",
    "name": "Trader Ram",
    "email": "ram@example.com",
    "mobile_number": "9876543211"
  },
  "createdAt": "2025-12-19T11:30:00Z",
  "updatedAt": "2025-12-19T11:30:00Z"
}
```

---

### 4. Get Single Sale Order
```
GET /api/sale-orders/507f1f77bcf86cd799439012
```

**Response**:
```json
{
  "id": "507f1f77bcf86cd799439012",
  "commodity": "Paddy",
  "variety": "Sona Masuri",
  "quantity_mt": 25,
  "price_per_quintal": 2300,
  "delivery_location": "Hyderabad",
  "payment_terms": "T+3 Days",
  "status": "Open",
  "seller_id": {
    "id": "507f1f77bcf86cd799439009",
    "name": "Trader Ram",
    "email": "ram@example.com"
  },
  "createdAt": "2025-12-19T11:30:00Z",
  "updatedAt": "2025-12-19T11:30:00Z"
}
```

---

### 5. Update Sale Order
```
PUT /api/sale-orders/507f1f77bcf86cd799439012
Content-Type: application/json
Authorization: Bearer <TOKEN>
```

**Request Body** (partial update):
```json
{
  "status": "Confirmed",
  "quantity_mt": 20,
  "notes": "Order partially confirmed"
}
```

**Response**:
```json
{
  "id": "507f1f77bcf86cd799439012",
  "commodity": "Paddy",
  "variety": "Sona Masuri",
  "quantity_mt": 20,
  "price_per_quintal": 2300,
  "delivery_location": "Hyderabad",
  "payment_terms": "T+3 Days",
  "status": "Confirmed",
  "notes": "Order partially confirmed",
  "seller_id": {
    "id": "507f1f77bcf86cd799439009",
    "name": "Trader Ram",
    "email": "ram@example.com"
  },
  "createdAt": "2025-12-19T11:30:00Z",
  "updatedAt": "2025-12-19T12:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": "Quantity must be greater than 0"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "Invalid or missing token"
}
```

### 403 Forbidden
```json
{
  "error": "Unauthorized",
  "message": "You can only view/edit your own orders"
}
```

### 404 Not Found
```json
{
  "error": "Purchase order not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Failed to create purchase order"
}
```

---

## cURL Examples

### Create Purchase Order
```bash
curl -X POST http://localhost:3001/api/purchase-orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commodity": "Paddy",
    "variety": "Basmati",
    "quantity_mt": 10,
    "expected_price_per_quintal": 2500,
    "delivery_location": "Delhi",
    "payment_terms": "Against Delivery"
  }'
```

### Get All Purchase Orders
```bash
curl -X GET http://localhost:3001/api/purchase-orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Sale Order
```bash
curl -X POST http://localhost:3001/api/sale-orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commodity": "Paddy",
    "variety": "Sona Masuri",
    "quantity_mt": 25,
    "price_per_quintal": 2300,
    "delivery_location": "Hyderabad",
    "payment_terms": "T+3 Days"
  }'
```

### Get All Sale Orders
```bash
curl -X GET http://localhost:3001/api/sale-orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Status Workflow

```
       CREATE
         │
         ▼
    ┌─────────────┐
    │    OPEN     │ ◄─── Newly created order
    └──────┬──────┘
           │
           ▼
    ┌──────────────────┐
    │ IN_NEGOTIATION   │ ◄─── Parties discussing terms
    └──────┬───────────┘
           │
           ▼
    ┌─────────────┐
    │  CONFIRMED  │ ◄─── Agreement reached
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  COMPLETED  │ ◄─── Delivery done
    └─────────────┘

Any status can transition to:
    ┌──────────────┐
    │  CANCELLED   │ ◄─── Order cancelled
    └──────────────┘
```
