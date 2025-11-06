// server.js - Soundabode Backend with Gmail API (Direct Send)
// Fixes: invalid_grant root cause — uses ENV-driven redirect URI, better error logging,
// robust token fetch, and safer MIME generation with text+HTML.

import express from 'express';
import { google } from 'googleapis';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================

// MIDDLEWARE
// ============================================================================
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use((req, _res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// ============================================================================

// ENV VALIDATION & LOGGING
// ============================================================================
function logEnv() {
  console.log('\n📧 Configuring Gmail API...');
  const checks = {
    EMAIL_USER: !!process.env.EMAIL_USER,
    EMAIL_CLIENT_ID: !!process.env.EMAIL_CLIENT_ID,
    EMAIL_CLIENT_SECRET: !!process.env.EMAIL_CLIENT_SECRET,
    EMAIL_REDIRECT_URI: !!process.env.EMAIL_REDIRECT_URI,
    EMAIL_REFRESH_TOKEN: !!process.env.EMAIL_REFRESH_TOKEN,
    ADMIN_EMAIL: !!process.env.ADMIN_EMAIL || !!process.env.EMAIL_USER,
  };
  Object.entries(checks).forEach(([k, v]) =>
    console.log(`${k}:`, v ? '✅ Set' : '❌ NOT SET')
  );
  if (!checks.EMAIL_REDIRECT_URI) {
    console.warn('⚠️ EMAIL_REDIRECT_URI not set. Set it to the exact URI used to mint the refresh token (e.g., https://developers.google.com/oauthplayground).');
  }
  if (!checks.EMAIL_REFRESH_TOKEN) {
    console.warn('⚠️ EMAIL_REFRESH_TOKEN not set. You must re-authorize with access_type=offline & prompt=consent to obtain one.');
  }
  console.log('ADMIN_EMAIL will be:', process.env.ADMIN_EMAIL || process.env.EMAIL_USER);
}
logEnv();

// ============================================================================

// GOOGLE AUTH HELPERS
// ============================================================================
function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.EMAIL_CLIENT_ID,
    process.env.EMAIL_CLIENT_SECRET,
    process.env.EMAIL_REDIRECT_URI // ⚠️ must EXACTLY match the URI used when minting refresh token
  );
  client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH_TOKEN });
  return client;
}

function explainGoogleError(err) {
  const data = err?.response?.data || err;
  const reason = data?.error_description || data?.error?.message || err?.message;
  console.error('Google error reason:', reason);
  try {
    console.error('Google error details:', JSON.stringify(data, null, 2));
  } catch (_) {}
  return reason || 'Unknown Google API error';
}

async function getAccessToken(oauth2Client) {
  try {
    const token = await oauth2Client.getAccessToken();
    if (!token || !token.token) throw new Error('No access token returned');
    return token.token;
  } catch (err) {
    throw new Error('Access token fetch failed: ' + explainGoogleError(err));
  }
}

const oauth2Client = getOAuthClient();
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ============================================================================

// STARTUP VERIFICATION
// ============================================================================
(async () => {
  console.log('🔧 Testing Gmail API configuration...');
  try {
    const token = await getAccessToken(oauth2Client);
    if (token) console.log('✅ Gmail API is ready to send emails\n');
  } catch (error) {
    console.error('❌ Gmail API configuration issue:', error.message);
    console.error('   Emails will fail until credentials are fixed\n');
  }
})();

// ============================================================================

// EMAIL MIME BUILDER (text + html alternative)
// ============================================================================
function createEmailMessage(to, subject, htmlBody = '', textBody = '') {
  const boundary = '----=_Part_' + Math.random().toString(36).slice(2);
  const from = `"Soundabode Academy" <${process.env.EMAIL_USER}>`;

  // Ensure From matches the authorized Gmail account
  if (!process.env.EMAIL_USER) {
    throw new Error('EMAIL_USER is required to build email');
  }

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary=${boundary}`,
  ].join('\n');

  const textPart = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    textBody || htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  ].join('\n');

  const htmlPart = [
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody || `<pre>${(textBody || '').replace(/</g, '&lt;')}</pre>`,
  ].join('\n');

  const closing = `--${boundary}--`;

  const message = [headers, '', textPart, '', htmlPart, '', closing].join('\n');

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return encodedMessage;
}

// ============================================================================

// GMAIL SEND WITH RETRIES
// ============================================================================
async function sendEmailViaGmailAPI(to, subject, htmlBody, textBody, maxRetries = 2) {
  let delay = 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Attempt ${attempt}/${maxRetries} - Sending to ${to}...`);

      // Ensure access token is valid; googleapis will use the client, but we preflight for clearer errors
      await getAccessToken(oauth2Client);

      const raw = createEmailMessage(to, subject, htmlBody, textBody);
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw },
      });

      console.log(`✅ Email sent: ${result.data.id}`);
      return { success: true, messageId: result.data.id };
    } catch (error) {
      const reason = explainGoogleError(error);
      console.error(`❌ Attempt ${attempt} failed:`, reason);
      // If it's an auth error like invalid_grant, no point retrying further
      if (/invalid_grant|unauthorized_client|access_denied|invalid_client/i.test(reason)) {
        return { success: false, error: reason };
      }
      if (attempt === maxRetries) {
        return { success: false, error: reason };
      }
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2; // exponential backoff
    }
  }
}

// ============================================================================

// ROUTES
// ============================================================================
app.get('/', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'Soundabode Backend Server',
    timestamp: new Date().toISOString(),
    emailProvider: 'Gmail API (Direct)',
    configured: !!(
      process.env.EMAIL_USER &&
      process.env.EMAIL_CLIENT_ID &&
      process.env.EMAIL_CLIENT_SECRET &&
      process.env.EMAIL_REFRESH_TOKEN &&
      process.env.EMAIL_REDIRECT_URI
    ),
  });
});

app.get('/health', (_req, res) => res.send('ok'));

app.get('/debug-oauth', async (_req, res) => {
  try {
    const token = await oauth2Client.getAccessToken();
    res.json({
      ok: !!token?.token,
      token: token?.token ? 'issued' : null,
      usingClientId: !!process.env.EMAIL_CLIENT_ID,
      usingRefreshToken: !!process.env.EMAIL_REFRESH_TOKEN,
      redirectUri: process.env.EMAIL_REDIRECT_URI || null,
      user: process.env.EMAIL_USER || null,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Popup form
app.post('/api/popup-form', limiter, async (req, res) => {
  try {
    console.log('📩 Popup form received:', req.body);

    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email, and phone are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    console.log('✅ Validation passed');
    console.log('📧 Sending emails via Gmail API...');

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">🔥 New Popup Inquiry</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333;">Contact Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr><td style="padding: 12px; background: #f5f5f5; font-weight: bold; width: 120px;">Name:</td><td style="padding: 12px;">${name}</td></tr>
            <tr><td style="padding: 12px; background: #f5f5f5; font-weight: bold;">Email:</td><td style="padding: 12px;"><a href="mailto:${email}" style="color: #667eea;">${email}</a></td></tr>
            <tr><td style="padding: 12px; background: #f5f5f5; font-weight: bold;">Phone:</td><td style="padding: 12px;"><a href="tel:${phone}" style="color: #667eea;">${phone}</a></td></tr>
          </table>
          ${message ? `<div style="margin-top: 25px; padding: 15px; background: #f9f9f9; border-left: 4px solid #667eea; border-radius: 5px;"><h3 style="margin: 0 0 10px 0; color: #333;">Message:</h3><p style="margin: 0; line-height: 1.6; color: #555;">${message}</p></div>` : ''}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
            <p style="margin: 0;">Submitted on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </div>
      </div>`;

    const userHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Soundabode! 🎵</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hi ${name}! 👋</h2>
          <p style="line-height: 1.8; color: #555; font-size: 16px;">Thank you for reaching out to <strong>Soundabode</strong> — India's leading academy for Music Production and DJ Training!</p>
          <p style="line-height: 1.8; color: #555; font-size: 16px;">We've received your inquiry and our team will get back to you within <strong>24 hours</strong>.</p>
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; margin: 25px 0; text-align: center;">
            <p style="color: white; margin: 0; font-size: 18px; font-weight: bold;">🎧 Ready to Start Your Musical Journey? 🎹</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #555; margin-bottom: 15px; font-size: 16px;">Have immediate questions?</p>
            <a href="tel:+919975016189" style="display: inline-block; background: #25D366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px;">📞 Call: +91 997 501 6189</a>
            <a href="https://wa.me/919975016189" style="display: inline-block; background: #25D366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px;">💬 WhatsApp Us</a>
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0;"><strong>Soundabode Academy</strong><br>Vision 9, 2nd Floor, Pimple Saudagar, Pune 411017<br><a href="mailto:services@soundabode.com" style="color: #667eea;">services@soundabode.com</a></p>
          </div>
        </div>
      </div>`;

    // Admin
    const adminResult = await sendEmailViaGmailAPI(
      process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      ` New Quick Inquiry - ${name}`,
      adminHtml,
      `New Popup Inquiry\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}${message ? `\nMessage: ${message}` : ''}`
    );

    if (!adminResult.success) {
      throw new Error(`Admin email failed: ${adminResult.error}`);
    }

    // User
    const userResult = await sendEmailViaGmailAPI(
      email,
      'Thank you for contacting Soundabode! 🎵',
      userHtml,
      `Hi ${name}!\n\nThank you for reaching out to Soundabode Academy.`
    );

    if (!userResult.success) {
      console.warn('⚠️  User email failed, but admin was notified');
    }

    console.log('✅ Form processed successfully');

    res.status(200).json({ success: true, message: "Thank you! We'll contact you within 24 hours." });
  } catch (error) {
    console.error('❌ Error (popup-form):', error.message);
    res.status(500).json({ success: false, message: 'Failed to submit. Please try again or call +91 997 501 6189' });
  }
});

// Contact form
app.post('/api/contact-form', limiter, async (req, res) => {
  try {
    console.log('📩 Contact form received:', req.body);

    const { fullName, email, phone, course, message } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #667eea;">New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
        <p><strong>Course:</strong> ${course || 'Not specified'}</p>
        ${message ? `<p><strong>Message:</strong><br>${message}</p>` : ''}
        <hr>
        <p style="color: #888; font-size: 12px;">Submitted: ${new Date().toLocaleString('en-IN')}</p>
      </div>`;

    const adminResult = await sendEmailViaGmailAPI(
      process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      `📝 Contact Form - ${fullName} (${course || 'General'})`,
      adminHtml,
      `Contact Form\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}`
    );

    if (!adminResult.success) {
      throw new Error('Failed to send admin notification: ' + adminResult.error);
    }

    await sendEmailViaGmailAPI(
      email,
      'Thank you for contacting Soundabode!',
      `<h2>Hi ${fullName}!</h2><p>Thank you for contacting Soundabode Academy. We'll respond within 24 hours.</p>`,
      `Hi ${fullName}!\n\nThank you for contacting Soundabode Academy.`
    );

    res.status(200).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    console.error('❌ Error (contact-form):', error.message);
    res.status(500).json({ success: false, message: 'Failed to send. Please try again.' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// ============================================================================

// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('✅ Soundabode Backend Server Running');
  console.log('🌐 Port:', PORT);
  console.log('📧 Email Provider: Gmail API (Direct)');
  console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
  console.log('='.repeat(60) + '\n');
});
