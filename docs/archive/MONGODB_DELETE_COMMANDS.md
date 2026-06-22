# MongoDB Commands to Delete All Confirmed Orders

## Delete All Confirmed Purchase Orders

```javascript
// In MongoDB Shell or MongoDB Compass
db.confirmedpurchaseorders.deleteMany({})
```

## Delete All Confirmed Sales Orders

```javascript
// In MongoDB Shell or MongoDB Compass
db.confirmedsalesorders.deleteMany({})
```

## Delete Both Confirmed Purchase and Sales Orders

```javascript
// Delete confirmed purchase orders
db.confirmedpurchaseorders.deleteMany({})

// Delete confirmed sales orders
db.confirmedsalesorders.deleteMany({})
```

## Verify Deletion

```javascript
// Count remaining confirmed purchase orders
db.confirmedpurchaseorders.countDocuments({})

// Count remaining confirmed sales orders
db.confirmedsalesorders.countDocuments({})
```

## Using MongoDB Atlas

1. Go to your MongoDB Atlas cluster
2. Click on "Browse Collections"
3. Find the `confirmedpurchaseorders` collection
4. Click on the collection
5. Click "Delete" button or use the filter `{}` and delete all documents
6. Repeat for `confirmedsalesorders` collection

## Using MongoDB Compass

1. Connect to your MongoDB database
2. Navigate to the `grainology` database (or your database name)
3. Find `confirmedpurchaseorders` collection
4. Click on it
5. Click "Delete" and select "Delete All Documents"
6. Repeat for `confirmedsalesorders` collection
