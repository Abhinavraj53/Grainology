// API Testing Script for Grainology Backend
// Run with: node test-api.js

const API_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_API_URL = process.env.FRONTEND_API_URL || `${API_URL}/api`;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

async function testEndpoint(name, url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    const status = response.ok ? '✅' : '⚠️';
    const color = response.ok ? colors.green : colors.yellow;

    console.log(`${color}${status} ${name}${colors.reset}`);
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Response: ${JSON.stringify(data).substring(0, 150)}...`);
    console.log('');

    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`${colors.red}❌ ${name}${colors.reset}`);
    console.log(`   Error: ${error.message}`);
    console.log('');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(`${colors.blue}🧪 Testing Grainology API Endpoints${colors.reset}`);
  console.log('====================================\n');

  // Test 1: Health Check
  await testEndpoint('Health Check', `${API_URL}/health`);

  // Test 2: Session Check
  await testEndpoint('Session Check', `${FRONTEND_API_URL}/auth/session`);

  // Test 3: KYC Verification (Aadhaar - will fail with 404)
  await testEndpoint(
    'KYC Verification (Aadhaar)',
    `${FRONTEND_API_URL}/auth/verify-kyc-before-signup`,
    {
      method: 'POST',
      body: {
        verificationType: 'aadhaar',
        documentNumber: '123456789012',
        verificationMethod: 'quickekyc',
      },
    }
  );

  // Test 4: Didit.me Session Creation
  await testEndpoint(
    'Didit.me Session Creation',
    `${FRONTEND_API_URL}/auth/didit/create-session-before-signup`,
    {
      method: 'POST',
    }
  );

  // Test 5: Invalid endpoint (should return 404)
  await testEndpoint('Invalid Endpoint (404 test)', `${FRONTEND_API_URL}/invalid-endpoint`);

  console.log('====================================');
  console.log(`${colors.blue}📊 Test Summary${colors.reset}`);
  console.log('====================================\n');
  console.log('💡 Note:');
  console.log('   • KYC verification will show 404 (QuickeKYC service unavailable)');
  console.log('   • This is expected and handled gracefully\n');
  console.log(`${colors.green}✅ If endpoints are reachable, your API is working!${colors.reset}\n`);
}

runTests().catch(console.error);

