# MongoDB Commands to Delete All Confirmed Orders

## Option 1: Using MongoDB Shell (mongosh)

Connect to your MongoDB database and run:

```javascript
// Delete all confirmed purchase orders
db.confirmedpurchaseorders.deleteMany({})

// Delete all confirmed sales orders
db.confirmedsalesorders.deleteMany({})

// Verify deletion (should return 0)
db.confirmedpurchaseorders.countDocuments({})
db.confirmedsalesorders.countDocuments({})
```

## Option 2: Using MongoDB Compass

1. Open MongoDB Compass
2. Connect to your database
3. Navigate to the `confirmedpurchaseorders` collection
4. Click "Filter" and enter: `{}`
5. Click "Delete" button
6. Repeat for `confirmedsalesorders` collection

## Option 3: Using MongoDB Atlas (Web Interface)

1. Go to MongoDB Atlas
2. Navigate to your cluster
3. Click "Browse Collections"
4. Select `confirmedpurchaseorders` collection
5. Click "Delete" and confirm
6. Repeat for `confirmedsalesorders` collection

## Option 4: Using Node.js Script

Create a file `delete-orders.js`:

```javascript
const mongoose = require('mongoose');
const ConfirmedPurchaseOrder = require('./models/ConfirmedPurchaseOrder');
const ConfirmedSalesOrder = require('./models/ConfirmedSalesOrder');

async function deleteAllOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const purchaseResult = await ConfirmedPurchaseOrder.deleteMany({});
    const salesResult = await ConfirmedSalesOrder.deleteMany({});
    
    console.log(`Deleted ${purchaseResult.deletedCount} purchase orders`);
    console.log(`Deleted ${salesResult.deletedCount} sales orders`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

deleteAllOrders();
```

Run with: `node delete-orders.js`

## Quick Command (Copy-Paste Ready)

If you're using MongoDB Shell directly:

```javascript
use grainology
db.confirmedpurchaseorders.deleteMany({})
db.confirmedsalesorders.deleteMany({})
```

