# Test Credentials - Local Development

Use these credentials to test the application locally.

## Admin Account
```
Email: admin@grainology.com
Password: Admin123!
Role: Admin
```

## Farmer Accounts
```
1. Email: ramesh.kumar@demo.com
   Password: password123
   Name: Ramesh Kumar
   Role: Farmer

2. Email: sita.devi@demo.com
   Password: password123
   Name: Sita Devi
   Role: Farmer

3. Email: rajesh.yadav@demo.com
   Password: password123
   Name: Rajesh Yadav
   Role: Farmer

4. Email: priya.sharma@demo.com
   Password: password123
   Name: Priya Sharma
   Role: Farmer

5. Email: amit.singh@demo.com
   Password: password123
   Name: Amit Singh
   Role: Farmer
```

## Trader Accounts
```
1. Email: mohammed.trader@demo.com
   Password: password123
   Name: Mohammed Ali
   Role: Trader

2. Email: suresh.trading@demo.com
   Password: password123
   Name: Suresh Trading Company
   Role: Trader

3. Email: kumar.agri@demo.com
   Password: password123
   Name: Kumar Agri Traders
   Role: Trader
```

## FPO Accounts
```
1. Email: buxar.fpo@demo.com
   Password: password123
   Name: Buxar Farmer Producer Organization
   Role: FPO

2. Email: rohtas.fpo@demo.com
   Password: password123
   Name: Rohtas FPO Ltd.
   Role: FPO

3. Email: kaimur.fpo@demo.com
   Password: password123
   Name: Kaimur District FPO
   Role: FPO
```

## Test the Application

1. **Sign In as Farmer**:
   - Use any farmer email (e.g., `ramesh.kumar@demo.com`)
   - Password: `password123`
   - Navigate to "Create Trade" to create purchase/sale orders
   - View your orders in "Purchase Order" and "Sale Order" tabs

2. **Sign In as Trader**:
   - Use any trader email (e.g., `mohammed.trader@demo.com`)
   - Password: `password123`
   - You should see orders created by farmers

3. **Sign In as Admin**:
   - Use email: `admin@grainology.com`
   - Password: `Admin123!`
   - Go to "All Purchase Orders" and "All Sale Orders" to see all user orders
   - You can filter by status and see all trades

## Test Data Created

The seed script has created:
- ✅ 21 total users (5 farmers, 3 traders, 3 FPOs, 10 corporates/others)
- ✅ 5 offers from farmers
- ✅ 9 purchase orders from buyers
- ✅ 9 sale orders from sellers
- ✅ 5 trade orders
- ✅ Data isolation verified (customers see only their orders, admins see all)

## API Testing

You can also test the APIs directly using cURL or Postman:

### Get Auth Token
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ramesh.kumar@demo.com",
    "password": "Demo123!"
  }'
```

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

### Get Your Purchase Orders
```bash
curl -X GET http://localhost:3001/api/purchase-orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get All Purchase Orders (Admin Only)
```bash
curl -X GET http://localhost:3001/api/purchase-orders \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

📝 Test Credentials

### **Quick Start - Use These to Login:**

**Farmer Account:**
```
Email: ramesh.kumar@demo.com
Password: password123
```

**Trader Account:**
```
Email: mohammed.trader@demo.com
Password: password123
```
