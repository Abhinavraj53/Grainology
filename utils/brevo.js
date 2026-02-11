import dotenv from 'dotenv';

dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@grainologyagri.com';
const FROM_NAME = process.env.BREVO_FROM_NAME || 'Grainology';

/**
 * Send email using Brevo (formerly Sendinblue)
 * @param {String} to - Recipient email
 * @param {String} subject - Email subject
 * @param {String} html - Email HTML content
 * @param {String} text - Email text content (optional)
 * @returns {Promise<Object>} Brevo response
 */
export async function sendEmail(to, subject, html, text = null) {
  try {
    if (!BREVO_API_KEY) {
      console.warn('Brevo not configured. Email would be sent to:', to);
      console.warn('Subject:', subject);
      return { messageId: 'mock-' + Date.now() };
    }

    const body = {
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };
    if (text) body.textContent = text;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Brevo API ${response.status}`);
    }

    const data = await response.json().catch(() => ({}));
    console.log('Email sent successfully:', data.messageId);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send OTP email
 */
export async function sendOTPEmail(to, otp) {
  const subject = 'Your Grainology Verification OTP';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px dashed #10b981; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .otp { font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Grainology</h1>
          <p>Email Verification</p>
        </div>
        <div class="content">
          <h2>Hello!</h2>
          <p>Your verification OTP for Grainology account registration is:</p>
          <div class="otp-box">
            <div class="otp">${otp}</div>
          </div>
          <p>This OTP is valid for 10 minutes. Please do not share this OTP with anyone.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Grainology. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your Grainology verification OTP is: ${otp}. This OTP is valid for 10 minutes.`;
  return sendEmail(to, subject, html, text);
}

/**
 * Send welcome email (after admin approval)
 */
export async function sendWelcomeEmail(to, name) {
  const subject = 'Welcome to Grainology!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Grainology!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>Your account has been approved. You can now log in and use Grainology - your digital agri-marketplace.</p>
          <p>You can:</p>
          <ul>
            <li>Browse and create offers for agricultural commodities</li>
            <li>Connect with farmers, traders, and other stakeholders</li>
            <li>Access real-time market prices and analytics</li>
            <li>Manage your orders and transactions</li>
          </ul>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'https://grainologyagri.com'}/login" class="button">Login to Dashboard</a>
          </p>
          <p>Happy trading!</p>
          <p><strong>The Grainology Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Grainology. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Welcome to Grainology, ${name}! Your account has been approved. Visit ${process.env.FRONTEND_URL || 'https://grainologyagri.com'}/login to get started.`;
  return sendEmail(to, subject, html, text);
}

/**
 * Send "waiting for approval" email after registration
 */
export async function sendWaitingForApprovalEmail(to, name) {
  const subject = 'Grainology – Registration Received, Pending Approval';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .notice { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Grainology</h1>
          <p>Registration Received</p>
        </div>
        <div class="content">
          <h2>Hello ${name}!</h2>
          <p>Thank you for registering with Grainology.</p>
          <div class="notice">
            <strong>Please wait for approval.</strong> Your account is under review. You will receive an email once an admin approves your account. Until then, you will not be able to log in.
          </div>
          <p>If you have any questions, contact our support team.</p>
          <p><strong>The Grainology Team</strong></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Grainology. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Hello ${name}, your Grainology registration is received. Please wait for admin approval. You will get an email when your account is approved.`;
  return sendEmail(to, subject, html, text);
}
