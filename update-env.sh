#!/bin/bash

# Script to update .env file with Didit.me credentials and remove QuickeKYC

ENV_FILE=".env"
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔄 Updating .env file..."
echo ""

# Create backup
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$BACKUP_FILE"
  echo "✅ Created backup: $BACKUP_FILE"
else
  echo "⚠️  .env file not found. Creating new one..."
fi

# Remove QuickeKYC lines
if [ -f "$ENV_FILE" ]; then
  # Remove QuickeKYC lines (case insensitive)
  sed -i.bak '/^[^#]*QUICKEKYC/d' "$ENV_FILE" 2>/dev/null || \
  sed -i '' '/^[^#]*QUICKEKYC/d' "$ENV_FILE" 2>/dev/null
  rm -f "${ENV_FILE}.bak" 2>/dev/null
  echo "✅ Removed QuickeKYC credentials"
fi

# Add Didit.me configuration if not exists
if [ -f "$ENV_FILE" ]; then
  # Check if Didit.me config already exists
  if ! grep -q "DIDIT_APP_ID" "$ENV_FILE" 2>/dev/null; then
    echo "" >> "$ENV_FILE"
    echo "# Didit.me KYC Verification Configuration" >> "$ENV_FILE"
    echo "DIDIT_APP_ID=9e436e07-d8a2-4e4e-8832-fba0e66183e6" >> "$ENV_FILE"
    echo "DIDIT_API_KEY=uaYe00AVB711Cv_wf1Rky-ZUW4L-_6-fIa9WlNlg8GM" >> "$ENV_FILE"
    echo "DIDIT_BASE_URL=https://verification.didit.me" >> "$ENV_FILE"
    echo "DIDIT_WORKFLOW_ID=your-workflow-id-here" >> "$ENV_FILE"
    echo "✅ Added Didit.me configuration"
  else
    # Update existing Didit.me credentials
    sed -i.bak 's/^DIDIT_APP_ID=.*/DIDIT_APP_ID=9e436e07-d8a2-4e4e-8832-fba0e66183e6/' "$ENV_FILE" 2>/dev/null || \
    sed -i '' 's/^DIDIT_APP_ID=.*/DIDIT_APP_ID=9e436e07-d8a2-4e4e-8832-fba0e66183e6/' "$ENV_FILE" 2>/dev/null
    
    sed -i.bak 's/^DIDIT_API_KEY=.*/DIDIT_API_KEY=uaYe00AVB711Cv_wf1Rky-ZUW4L-_6-fIa9WlNlg8GM/' "$ENV_FILE" 2>/dev/null || \
    sed -i '' 's/^DIDIT_API_KEY=.*/DIDIT_API_KEY=uaYe00AVB711Cv_wf1Rky-ZUW4L-_6-fIa9WlNlg8GM/' "$ENV_FILE" 2>/dev/null
    
    sed -i.bak 's/^DIDIT_BASE_URL=.*/DIDIT_BASE_URL=https:\/\/verification.didit.me/' "$ENV_FILE" 2>/dev/null || \
    sed -i '' 's/^DIDIT_BASE_URL=.*/DIDIT_BASE_URL=https:\/\/verification.didit.me/' "$ENV_FILE" 2>/dev/null
    
    rm -f "${ENV_FILE}.bak" 2>/dev/null
    echo "✅ Updated existing Didit.me credentials"
  fi

  # Add Mandi (data.gov.in) configuration if not exists
  if ! grep -q "MANDI_API_KEY" "$ENV_FILE" 2>/dev/null; then
    {
      echo ""
      echo "# Mandi (data.gov.in) configuration"
      echo "MANDI_API_KEY=your-data-gov-api-key"
      echo "MANDI_API_BASE=https://api.data.gov.in"
      echo "MANDI_RESOURCE_ID=35985678-0d79-46b4-9ed6-6f13308a1d24"
      echo "# For classic resource, you can use:"
      echo "# MANDI_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070"
    } >> "$ENV_FILE"
    echo "✅ Added Mandi (data.gov.in) configuration placeholders"
  fi

  # Add Cashfree configuration placeholders if not exists
  if ! grep -q "CASHFREE_CLIENT_ID" "$ENV_FILE" 2>/dev/null; then
    {
      echo ""
      echo "# Cashfree Verification (Production) - fill with your real production credentials"
      echo "CASHFREE_CLIENT_ID=your-cashfree-production-client-id"
      echo "CASHFREE_CLIENT_SECRET=your-cashfree-production-client-secret"
      echo "CASHFREE_BASE_URL=https://api.cashfree.com"
    } >> "$ENV_FILE"
    echo "✅ Added Cashfree configuration placeholders (update with production keys)"
  fi

  # Ensure FRONTEND_URL is set to the latest production frontend URL
  if grep -q "^FRONTEND_URL=" "$ENV_FILE" 2>/dev/null; then
    # Update existing FRONTEND_URL
    sed -i.bak 's#^FRONTEND_URL=.*#FRONTEND_URL=https://grainologyagri.com#' "$ENV_FILE" 2>/dev/null || \
    sed -i '' 's#^FRONTEND_URL=.*#FRONTEND_URL=https://grainologyagri.com#' "$ENV_FILE" 2>/dev/null
    rm -f "${ENV_FILE}.bak" 2>/dev/null
    echo "✅ Updated FRONTEND_URL to https://grainologyagri.com"
  else
    {
      echo ""
      echo "# Frontend configuration"
      echo "FRONTEND_URL=https://grainologyagri.com"
    } >> "$ENV_FILE"
    echo "✅ Added FRONTEND_URL=https://grainologyagri.com"
  fi
else
  # Create new .env file
  cat > "$ENV_FILE" << 'ENVEOF'
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=https://grainologyagri.com
APP_BASE_URL=http://localhost:3001

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/grainology

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Didit.me KYC Verification Configuration
DIDIT_APP_ID=9e436e07-d8a2-4e4e-8832-fba0e66183e6
DIDIT_API_KEY=uaYe00AVB711Cv_wf1Rky-ZUW4L-_6-fIa9WlNlg8GM
DIDIT_BASE_URL=https://verification.didit.me
DIDIT_WORKFLOW_ID=your-workflow-id-here

# Note: Create a workflow in Didit Console (https://business.didit.me/)
# and copy the workflow_id to DIDIT_WORKFLOW_ID above

# Weather API Configuration
WEATHER_API_KEY=your-weather-api-key
WEATHER_API_PROVIDER=weatherapi
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Mandi (data.gov.in) configuration
MANDI_API_KEY=your-data-gov-api-key
MANDI_API_BASE=https://api.data.gov.in
MANDI_RESOURCE_ID=35985678-0d79-46b4-9ed6-6f13308a1d24
# For classic resource, you can use:
# MANDI_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
ENVEOF
  echo "✅ Created new .env file with Didit.me configuration"
fi

echo ""
echo "✅ .env file updated successfully!"
echo ""
echo "📝 Didit.me Credentials Added:"
echo "   • DIDIT_APP_ID=9e436e07-d8a2-4e4e-8832-fba0e66183e6"
echo "   • DIDIT_API_KEY=uaYe00AVB711Cv_wf1Rky-ZUW4L-_6-fIa9WlNlg8GM"
echo "   • DIDIT_BASE_URL=https://verification.didit.me"
echo ""
echo "⚠️  Important: Don't forget to:"
echo "   1. Set DIDIT_WORKFLOW_ID after creating workflow in Didit Console"
echo "   2. Review other configuration values (MongoDB, JWT, etc.)"
echo ""

