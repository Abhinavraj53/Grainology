#!/bin/bash

# Script to update MongoDB URL in .env file

echo "🔧 MongoDB URL Updater"
echo ""

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your MongoDB connection string"
    echo ""
    echo "Usage:"
    echo "  ./update-mongodb-url.sh 'mongodb+srv://username:password@cluster.mongodb.net/grainology'"
    echo ""
    echo "Or for local MongoDB:"
    echo "  ./update-mongodb-url.sh 'mongodb://localhost:27017/grainology'"
    echo ""
    exit 1
fi

MONGODB_URL="$1"

if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Backup .env file
cp .env .env.backup
echo "✅ Created backup: .env.backup"

# Update MONGODB_URI in .env file
if grep -q "^MONGODB_URI=" .env; then
    # Replace existing MONGODB_URI
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URL|" .env
    else
        # Linux
        sed -i "s|^MONGODB_URI=.*|MONGODB_URI=$MONGODB_URL|" .env
    fi
    echo "✅ Updated MONGODB_URI in .env file"
else
    # Add MONGODB_URI if it doesn't exist
    echo "MONGODB_URI=$MONGODB_URL" >> .env
    echo "✅ Added MONGODB_URI to .env file"
fi

echo ""
echo "📝 Updated .env file:"
grep "^MONGODB_URI=" .env | sed 's/\(mongodb:\/\/[^:]*:\)[^@]*\(@\)/\1***\2/' | sed 's/\(mongodb+srv:\/\/[^:]*:\)[^@]*\(@\)/\1***\2/'
echo ""
echo "✅ Done! Restart your server with: npm run dev"
