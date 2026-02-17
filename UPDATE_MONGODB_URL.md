# Update MongoDB URL

## Current Issue
Your `.env` file is using local MongoDB which is not running:
```
MONGODB_URI=mongodb://localhost:27017/grainology
```

## Solution: Use MongoDB Atlas (Cloud)

### Step 1: Get Your MongoDB Atlas Connection String

If you already have MongoDB Atlas:
1. Go to https://cloud.mongodb.com
2. Click on your cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database password
6. Replace `<database>` with `grainology`

**Format should look like:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/grainology?retryWrites=true&w=majority
```

### Step 2: Update .env File

Open `.env` file and update the MONGODB_URI line:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/grainology?retryWrites=true&w=majority
```

### Step 3: Restart Server

```bash
npm run dev
```

You should see:
```
✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
📊 Database: grainology
```

## If You Don't Have MongoDB Atlas

### Create Free Account:
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Sign up (free tier available)
3. Create a cluster (M0 - Free)
4. Create database user
5. Add IP whitelist (0.0.0.0/0 for development)
6. Get connection string
7. Update `.env` file

## Quick Update Command

If you have your MongoDB Atlas URL ready, run:

```bash
# Replace YOUR_MONGODB_URL with your actual connection string
echo "MONGODB_URI=YOUR_MONGODB_URL" > .env.temp && \
grep -v "^MONGODB_URI=" .env >> .env.temp && \
mv .env.temp .env
```

Or manually edit `.env` file and change:
```
MONGODB_URI=mongodb://localhost:27017/grainology
```
to:
```
MONGODB_URI=your_mongodb_atlas_connection_string
```
