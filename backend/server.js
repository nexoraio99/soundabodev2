// server.js - Soundabode Backend (popup vs contact email subjects + token cache)
// Usage: set EMAIL_USER, EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, EMAIL_REFRESH_TOKEN, ADMIN_EMAIL (optional), CORS_ORIGINS (optional)

import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ------------------- Basic security & parsers -------------------
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '150kb' }));
app.use(express.urlencoded({ extended: true }));

// ------------------- Rate limiter -------------------
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, try again later.' }
});
app.use('/api/', apiLimiter);

// ------------------- CORS (robust preflight handler) -------------------
const defaultOrigins = [
  'https://soundabode.com',
  'https://www.soundabode.com',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(','))
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Lightweight preflight/CORS middleware — runs before routes
app.use((req, res, next) => {
  const origin = req.get('Origin') || req.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    // If you need cookies/auth, set to 'true' and ensure credentials usage on client
    // res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ------------------- Logging middleware -------------------
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} Origin:${req.get('origin') || 'none'}`);
  next();
});

// ------------------- Gmail (OAuth2) setup -------------------
console.log('📧 Gmail configuration:');
console.log('  EMAIL_USER:', process.env.EMAIL_USER ? '✅' : '❌ NOT SET');
console.log('  EMAIL_CLIENT_ID:', process.env.EMAIL_CLIENT_ID ? '✅' : '❌ NOT SET');
console.log('  EMAIL_CLIENT_SECRET:', process.env.EMAIL_CLIENT_SECRET ? '✅' : '❌ NOT SET');
console.log('  EMAIL_REFRESH_TOKEN:', process.env.EMAIL_REFRESH_TOKEN ? '✅' : '❌ NOT SET');
console.log('  ADMIN_EMAIL:', process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '(not set)');

const oauth2Client = new google.auth.OAuth2(
  process.env.EMAIL_CLIENT_ID,
  process.env.EMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

// If refresh token is present, set it now (used when fetching access token)
if (process.env.EMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH_TOKEN });
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ------------------- TOKEN CACHING (reduce latency) -------------------
let cachedToken = null; // { token, expiry } - expiry is epoch ms

async function getAccessTokenCached() {
  const now = Date.now();
  // If cached token is valid for >30s, reuse
  if (cachedToken && cachedToken.token && cachedToken.expiry && (cachedToken.expiry - now > 30 * 1000)) {
    return cachedToken.token;
  }

  // Fetch a fresh token (this will use the refresh token you set earlier)
  try {
    const res = await oauth2Client.getAccessToken();
    // googleapis sometimes returns { token, res } or string; normalize
    const token = (res && res.token) ? res.token : (typeof res === 'string' ? res : null);

    // expiry_date may be on oauth2Client.credentials
    const creds = oauth2Client.credentials || {};
    const expiry = creds.expiry_date ? Number(creds.expiry_date) : (Date.now() + 55 * 60 * 1000);

    cachedToken = { token, expiry };
    console.log(`🔑 Gmail access token refreshed — expires in ${Math.round((expiry - now) / 60000)}m`);
    return token;
  } catch (err) {
    console.warn('⚠️ getAccessTokenCached error:', err && err.message ? err.message : err);
    return null;
  }
}

// ------------------- Helpers -------------------
function pickName(body) {
  if (!body) return 'Unknown';
  return (body.fullName || body.fullname || body.name || 'Unknown').toString().trim();
}

function formatCourseName(course) {
  const map = {
    'dj-training': 'DJ Training',
    'music-production': 'Music Production',
    'audio-engineering': 'Audio Engineering'
  };
  if (!course) return 'N/A';
  return map[course] || course;
}

function buildRawMessage({ from, to, subject, htmlBody, textBody }) {
  const msgId = `<${randomUUID()}@soundabode.local>`;
  const dateHeader = new Date().toUTCString();
  const parts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Message-ID: ${msgId}`,
    `Date: ${dateHeader}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody || textBody || ''
  ];
  return Buffer.from(parts.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ------------------- Send email with retries (uses cached token) -------------------
async function sendEmailRaw({ to, subject, htmlBody, textBody, maxRetries = 2 }) {
  if (!process.env.EMAIL_USER) throw new Error('EMAIL_USER not configured');

  // Try to ensure we have a cached access token and set it on oauth2Client
  try {
    const token = await getAccessTokenCached();
    if (token) {
      oauth2Client.setCredentials({ access_token: token, refresh_token: process.env.EMAIL_REFRESH_TOKEN });
    }
  } catch (err) {
    console.warn('⚠️ Could not set access token on oauth2 client:', err && err.message ? err.message : err);
  }

  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = buildRawMessage({
        from: `"Soundabode Academy" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        htmlBody,
        textBody
      });

      const t0 = Date.now();
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
      });
      console.log(`✅ Email sent to ${to} id=${res.data && res.data.id} (send-ms=${Date.now() - t0})`);
      return { success: true, id: res.data && res.data.id };
    } catch (err) {
      lastErr = err;
      console.warn(`Email attempt ${attempt} failed:`, err && err.message ? err.message : err);
      // On auth errors we can try to clear cached token and retry once
      if (err && err.code && (err.code === 401 || err.code === 403)) {
        cachedToken = null; // force refresh next loop
      }
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 800)); // small backoff
    }
  }

  return { success: false, error: lastErr && (lastErr.message || String(lastErr)) };
}

// ------------------- Routes -------------------
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Soundabode Backend',
    timestamp: new Date().toISOString(),
    endpoints: { popupForm: '/api/popup-form', contactForm: '/api/contact-form', health: '/health' },
    configured: !!(process.env.EMAIL_USER && process.env.EMAIL_CLIENT_ID && process.env.EMAIL_REFRESH_TOKEN)
  });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

// ------------------- POPUP FORM (homepage) -------------------
app.post('/api/popup-form', async (req, res) => {
  try {
    console.log('📩 /api/popup-form payload:', req.body);
    const fullName = pickName(req.body);
    const email = (req.body && req.body.email) ? String(req.body.email).trim() : '';
    const phone = (req.body && req.body.phone) ? String(req.body.phone).trim() : '';
    const message = (req.body && req.body.message) ? String(req.body.message).trim() : '';

    if (!fullName || !email || !phone) {
      console.log('❌ Popup validation failed');
      return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const timestampLocal = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const ref = randomUUID().slice(0, 8);
    const subject = `[Popup] Homepage Inquiry — ${fullName} — ${timestampLocal} — ${ref}`;

    console.log('Popup subject ->', subject);

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;border-radius:8px;text-align:center;color:#fff;">
          <h2 style="margin:6px 0">🔥 New Popup Inquiry (Homepage)</h2>
        </div>
        <div style="background:#fff;padding:16px;border-radius:6px;margin-top:12px;color:#333">
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          <hr/>
          <p style="font-size:12px;color:#888">Submitted on ${timestampLocal} — Source: Homepage Popup Form — Ref: ${ref}</p>
        </div>
      </div>
    `;

    // Send admin (blocking)
    const adminRes = await sendEmailRaw({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      htmlBody: adminHtml,
      textBody: `Popup inquiry from ${fullName}`
    });
    if (!adminRes.success) throw new Error(adminRes.error || 'Admin email failed');

    // Send user (best-effort)
    try {
      await sendEmailRaw({
        to: email,
        subject: `Thanks — Soundabode received your homepage inquiry`,
        htmlBody: `<h2>Hi ${fullName} 👋</h2><p>Thanks for contacting Soundabode. We've received your inquiry and will respond within 24 hours. Ref: ${ref}</p>`,
        textBody: `Thanks ${fullName}, we will reply shortly. Ref: ${ref}`
      });
    } catch (err) {
      console.warn('Non-blocking: user popup email failed:', err && err.message ? err.message : err);
    }

    return res.status(200).json({ success: true, message: 'Popup inquiry received', ref });
  } catch (err) {
    console.error('Popup error:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Failed to process popup form' });
  }
});

// ------------------- CONTACT FORM (contact page) -------------------
app.post('/api/contact-form', async (req, res) => {
  try {
    console.log('📩 /api/contact-form payload:', req.body);

    // Accept either fullName or name (legacy)
    const fullName = (req.body && (req.body.fullName || req.body.fullname || req.body.name)) || '';
    const email = (req.body && req.body.email) ? String(req.body.email).trim() : '';
    const phone = (req.body && req.body.phone) ? String(req.body.phone).trim() : '';
    const course = (req.body && req.body.course) ? String(req.body.course).trim() : '';
    const message = (req.body && req.body.message) ? String(req.body.message).trim() : '';

    // Validate required fields (Full name, phone number, email)
    if (!fullName || !email || !phone) {
      console.log('❌ Contact validation failed');
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const isCourse = Boolean(course && course !== '');
    const formattedCourse = isCourse ? formatCourseName(course) : 'N/A';
    const enquiryType = isCourse ? 'Course Enquiry' : 'General Enquiry';

    const timestampLocal = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const ref = randomUUID().slice(0, 8);
    const subject = isCourse
      ? `[Contact] Course Enquiry — ${formattedCourse} — ${fullName} — ${timestampLocal} — ${ref}`
      : `[Contact] General Enquiry — ${fullName} — ${timestampLocal} — ${ref}`;

    console.log('Contact subject ->', subject);

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg, ${isCourse ? '#4CAF50' : '#667eea'} 0%, ${isCourse ? '#45a049' : '#764ba2'} 100%);padding:20px;border-radius:8px;text-align:center;color:#fff;">
          <h2 style="margin:6px 0">${isCourse ? '🎓' : '📧'} New ${enquiryType}</h2>
        </div>
        <div style="background:#fff;padding:16px;border-radius:6px;margin-top:12px;color:#333">
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
          ${isCourse ? `<p><strong>Course:</strong> ${formattedCourse}</p>` : ''}
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          <hr/>
          <p style="font-size:12px;color:#888">Submitted on ${timestampLocal} — Source: Contact Page Form — Ref: ${ref}</p>
        </div>
      </div>
    `;

    // Send admin email (blocking)
    const adminRes = await sendEmailRaw({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      htmlBody: adminHtml,
      textBody: `Contact enquiry: ${fullName}`
    });
    if (!adminRes.success) throw new Error(adminRes.error || 'Admin email failed');

    // Send user autoresponse (best-effort)
    try {
      const userSubject = `Soundabode — We've received your enquiry (${ref})`;
      const userHtml = `<h2>Hi ${fullName}</h2><p>Thanks for contacting Soundabode. We'll reply within 24 hours. Ref: ${ref}</p>`;
      await sendEmailRaw({ to: email, subject: userSubject, htmlBody: userHtml, textBody: `Thanks ${fullName}, ref ${ref}` });
    } catch (err) {
      console.warn('Non-blocking: user contact email failed:', err && err.message ? err.message : err);
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully!', ref });
  } catch (err) {
    console.error('Contact error:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Failed to send. Please try again.' });
  }
});

// ------------------- 404 handler -------------------
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// ------------------- Start server -------------------
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('✅ Soundabode Backend Server Running');
  console.log(`🌐 Port: ${PORT}`);
  console.log('📧 Email Provider: Gmail API (Direct)');
  console.log('🔒 CORS Allowed Origins:', allowedOrigins.join(', '));
  console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
  console.log('='.repeat(60));
});
