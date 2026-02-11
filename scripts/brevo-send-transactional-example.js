/**
 * Brevo reference: send a transactional email (not a campaign)
 * Uses same credentials as the app: BREVO_SMTP_KEY + BREVO_SMTP_USER or BREVO_API_KEY
 *
 * For campaigns (marketing), use Brevo → Campaigns in the dashboard or the Campaigns API.
 * For OTP/Welcome/Waiting emails we use transactional API (or SMTP) - see utils/brevo.js
 */
import dotenv from 'dotenv';
dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@grainologyagri.com';
const FROM_NAME = process.env.BREVO_FROM_NAME || 'Grainology';

async function sendTransactionalEmail() {
  if (!BREVO_API_KEY || BREVO_API_KEY.startsWith('xsmtpsib-')) {
    console.log('Use SMTP in app (utils/brevo.js). This script needs an API key from Brevo → API keys & MCP.');
    console.log('Or run the app and register a user to trigger OTP email via SMTP.');
    return;
  }

  const body = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: 'test@example.com' }],
    subject: 'Test from Grainology Brevo API',
    htmlContent: '<p>Congratulations! You successfully sent this transactional email via the Brevo API.</p>',
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('Brevo API error:', err.message || response.status);
    return;
  }
  const data = await response.json();
  console.log('API called successfully. Returned data:', data);
}

sendTransactionalEmail();
