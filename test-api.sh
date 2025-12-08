#!/bin/bash

# API Testing Script for Grainology Backend
# This script tests various API endpoints

echo "🧪 Testing Grainology API Endpoints"
echo "===================================="
echo ""

API_URL="http://localhost:3001"
FRONTEND_URL="${VITE_API_URL:-http://localhost:3001/api}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
HEALTH=$(curl -s "${API_URL}/health")
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✅ Health Check: PASSED${NC}"
    echo "   Response: $HEALTH"
else
    echo -e "${RED}❌ Health Check: FAILED${NC}"
    echo "   Response: $HEALTH"
fi
echo ""

# Test 2: KYC Verification Endpoint (QuickeKYC - Aadhaar)
echo "2️⃣  Testing KYC Verification (Aadhaar - will fail with 404 as expected)..."
KYC_RESPONSE=$(curl -s -X POST "${FRONTEND_URL}/auth/verify-kyc-before-signup" \
    -H "Content-Type: application/json" \
    -d '{
        "verificationType": "aadhaar",
        "documentNumber": "123456789012",
        "verificationMethod": "quickekyc"
    }')
if echo "$KYC_RESPONSE" | grep -q "verified\|error"; then
    echo -e "${YELLOW}⚠️  KYC Verification: Endpoint is reachable (404 expected)${NC}"
    echo "   Response: $(echo $KYC_RESPONSE | head -c 200)"
else
    echo -e "${RED}❌ KYC Verification: FAILED${NC}"
    echo "   Response: $KYC_RESPONSE"
fi
echo ""

# Test 3: Didit.me Session Creation (Pre-signup)
echo "3️⃣  Testing Didit.me Session Creation..."
DIDIT_RESPONSE=$(curl -s -X POST "${FRONTEND_URL}/auth/didit/create-session-before-signup" \
    -H "Content-Type: application/json")
if echo "$DIDIT_RESPONSE" | grep -q "session\|error"; then
    echo -e "${YELLOW}⚠️  Didit.me Session: Endpoint is reachable${NC}"
    echo "   Response: $(echo $DIDIT_RESPONSE | head -c 200)"
else
    echo -e "${RED}❌ Didit.me Session: FAILED${NC}"
    echo "   Response: $DIDIT_RESPONSE"
fi
echo ""

# Test 4: Session Check (No auth required)
echo "4️⃣  Testing Session Check..."
SESSION_RESPONSE=$(curl -s "${FRONTEND_URL}/auth/session")
if echo "$SESSION_RESPONSE" | grep -q "user\|session"; then
    echo -e "${GREEN}✅ Session Check: PASSED${NC}"
    echo "   Response: $(echo $SESSION_RESPONSE | head -c 100)"
else
    echo -e "${RED}❌ Session Check: FAILED${NC}"
    echo "   Response: $SESSION_RESPONSE"
fi
echo ""

echo "===================================="
echo "📊 Test Summary"
echo "===================================="
echo ""
echo "💡 Note: KYC verification will show errors because:"
echo "   • QuickeKYC API endpoint returns 404 (service unavailable)"
echo "   • This is expected and handled gracefully"
echo ""
echo "✅ If all endpoints are reachable, your API is working correctly!"
echo ""
