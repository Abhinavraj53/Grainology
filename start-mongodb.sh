#!/bin/bash

# MongoDB Startup Script for macOS

echo "🔧 Setting up MongoDB..."

# Create data directory in user's home directory (no sudo needed)
DATA_DIR="$HOME/data/db"
LOG_DIR="$HOME/data/log"

mkdir -p "$DATA_DIR"
mkdir -p "$LOG_DIR"

echo "✅ Created directories:"
echo "   Data: $DATA_DIR"
echo "   Logs: $LOG_DIR"

# Check if MongoDB is already running
if pgrep -f mongod > /dev/null; then
    echo "✅ MongoDB is already running!"
    exit 0
fi

# Start MongoDB in background
echo "🚀 Starting MongoDB..."
mongod --dbpath "$DATA_DIR" --logpath "$LOG_DIR/mongo.log" > /dev/null 2>&1 &

# Wait a moment for MongoDB to start
sleep 2

# Check if it started successfully
if pgrep -f mongod > /dev/null; then
    echo "✅ MongoDB started successfully!"
    echo "📊 Database: grainology"
    echo "🔌 Port: 27017"
    echo ""
    echo "To stop MongoDB, run: pkill mongod"
else
    echo "❌ Failed to start MongoDB"
    echo "💡 Try running manually: mongod --dbpath $DATA_DIR"
    exit 1
fi
