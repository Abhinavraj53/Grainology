#!/bin/bash

# Quick Start Script for Grainology Localhost Development
# This script helps you start both frontend and backend

echo "🚀 Grainology Localhost Setup"
echo "================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create .env file first. See SETUP_LOCALHOST.md"
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating..."
    echo "VITE_API_URL=http://localhost:3001/api" > .env.local
    echo "✅ Created .env.local"
fi

# Check MongoDB URI
MONGODB_URI=$(grep "^MONGODB_URI=" .env | cut -d '=' -f2-)
if [ -z "$MONGODB_URI" ] || [[ "$MONGODB_URI" == *"your_mongodb"* ]] || [[ "$MONGODB_URI" == *"localhost:27017"* ]]; then
    echo "⚠️  Warning: MongoDB URI may need to be updated in .env"
    echo "   Current: $MONGODB_URI"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Check for required packages
echo "🔍 Checking required packages..."
if ! npm list cloudinary > /dev/null 2>&1; then
    echo "⚠️  cloudinary not found. Installing..."
    npm install cloudinary
fi

if ! npm list mailgun.js > /dev/null 2>&1; then
    echo "⚠️  mailgun.js not found. Installing..."
    npm install mailgun.js
fi

echo ""
echo "✅ All dependencies ready!"
echo ""
echo "📋 To start development servers:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   $ npm run dev"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   $ npm run dev:frontend"
echo ""
echo "   Then open: http://localhost:5173"
echo ""
echo "   Or use concurrently (if installed):"
echo "   $ npm install -g concurrently"
echo "   $ npm run dev:all"
echo ""
