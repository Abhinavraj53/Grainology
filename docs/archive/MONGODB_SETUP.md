# MongoDB Connection Setup Guide

## Current Issue
Your `.env` file is configured to use local MongoDB:
```
MONGODB_URI=mongodb://localhost:27017/grainology
```

But MongoDB is not running locally.

## Solutions

### Option 1: Use MongoDB Atlas (Cloud - Recommended)

1. **Create a free MongoDB Atlas account** (if you don't have one):
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up for free

2. **Create a Cluster**:
   - Click "Build a Database"
   - Choose "FREE" tier (M0)
   - Select a region close to you
   - Click "Create"

3. **Set up Database Access**:
   - Go to "Database Access" → "Add New Database User"
   - Create username and password (save these!)
   - Set privileges to "Read and write to any database"
   - Click "Add User"

4. **Set up Network Access**:
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Or add your specific IP: `0.0.0.0/0`
   - Click "Confirm"

5. **Get Connection String**:
   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<database>` with `grainology` (or your preferred database name)

6. **Update `.env` file**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/grainology?retryWrites=true&w=majority
   ```

### Option 2: Start Local MongoDB

#### If MongoDB is installed via Homebrew:
```bash
brew services start mongodb-community
# or
brew services start mongodb-community@7.0
```

#### If MongoDB is installed manually:
```bash
# Start MongoDB service
sudo systemctl start mongod
# or on macOS
mongod --config /usr/local/etc/mongod.conf
```

#### If MongoDB is NOT installed:
```bash
# Install MongoDB via Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

### Option 3: Use Docker (Alternative)

```bash
# Run MongoDB in Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=grainology \
  mongo:latest

# Your connection string remains:
# MONGODB_URI=mongodb://localhost:27017/grainology
```

## Verify Connection

After updating your `.env` file, restart your server:

```bash
npm run dev
```

You should see:
```
✅ MongoDB Connected: ...
📊 Database: grainology
```

## Troubleshooting

### If you see "MongoServerError: bad auth"
- Check your username and password in the connection string
- Verify database user has correct permissions

### If you see "MongoServerError: IP not whitelisted"
- Go to MongoDB Atlas → Network Access
- Add your IP address or `0.0.0.0/0` for development

### If you see "connection timeout"
- Check your internet connection
- Verify MongoDB Atlas cluster is running
- Check firewall settings

### If local MongoDB won't start
- Check if port 27017 is already in use: `lsof -i :27017`
- Check MongoDB logs: `/usr/local/var/log/mongodb/mongo.log`
- Try restarting: `brew services restart mongodb-community`

## Quick Test

Test your MongoDB connection:
```bash
node scripts/testMongoDB.js
```

This will verify your connection string and show any errors.
