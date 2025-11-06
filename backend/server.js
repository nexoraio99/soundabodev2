// server.js - Soundabode Backend (robust, single-file replacement)
// Usage: set env vars: PORT, CORS_ORIGINS (comma separated), EMAIL_USER, EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, EMAIL_REFRESH_TOKEN, ADMIN_EMAIL (optional)

import express from 'express';
import { google } from 'googleapis';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// -----------------------
// Security & middleware
// -----------------------
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '150kb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiter for /api
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, try again later.' }
});
app.use('/api/', limiter);

// -----------------------
// CORS - dynamic allowlist
// -----------------------
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

const corsOptions = {
  origin(origin, callback) {
    // If no origin (curl/postman/server-to-server) allow request to reach server for auth checks (CORS only applies to browsers)
    if (!origin) return callback(null, false); // returns false to keep browser from accepting; non-browser clients ignore CORS
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('CORS denied for origin:', origin);
    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
};
app.options('*', cors(corsOptions));
app.use((req, res, next) => {
  cors(corsOptions)(req, res, err => {
    if (err) return res.status(403).json({ success: false, message: 'CORS origin denied' });
    next();
  });
});

// -----------------------
// Logging
// -----------------------
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} Origin:${req.get('origin') || 'none'}`);
  next();
});

// -----------------------
// Gmail API setup
// -----------------------
console.log('\n📧 Gmail configuration check...');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅' : '❌ NOT SET');
console.log('EMAIL_CLIENT_ID:', process.env.EMAIL_CLIENT_ID ? '✅' : '❌ NOT SET');
console.log('EMAIL_CLIENT_SECRET:', process.env.EMAIL_CLIENT_SECRET ? '✅' : '❌ NOT SET');
console.log('EMAIL_REFRESH_TOKEN:', process.env.EMAIL_REFRESH_TOKEN ? '✅' : '❌ NOT SET');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '(not set)');

const oauth2Client = new google.auth.OAuth2(
  process.env.EMAIL_CLIENT_ID,
  process.env.EMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

if (process.env.EMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH_TOKEN });
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// quick token test (non-blocking)
(async () => {
  if (!process.env.EMAIL_CLIENT_ID || !process.env.EMAIL_REFRESH_TOKEN) {
    console.warn('⚠️ Gmail credentials incomplete. Emails will fail until configured.');
    return;
  }
  try {
    const at = await oauth2Client.getAccessToken();
    if (at && at.token) console.log('✅ Gmail API access token obtained');
    else console.warn('⚠️ Could not obtain Gmail access token at startup');
  } catch (err) {
    console.warn('⚠️ Gmail startup check error:', err && err.message ? err.message : err);
  }
})();

// -----------------------
// Helpers
// -----------------------
function normalizeName(body) {
  if (!body) return 'Unknown';
  return body.fullName || body.fullname || body.name || 'Unknown';
}

function formatCourseName(courseValue) {
  const mapping = {
    'dj-training': 'DJ Training',
    'music-production': 'Music Production',
    'audio-engineering': 'Audio Engineering'
  };
  if (!courseValue) return 'N/A';
  return mapping[courseValue] || courseValue;
}

function buildRawMessage({ from, to, subject, htmlBody, textBody }) {
  // Add Message-ID and Date headers
  const msgId = `<${randomUUID()}@soundabode.local>`;
  const dateHeader = new Date().toUTCString();

  const lines = [
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
  return Buffer.from(lines.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendEmail({ to, subject, htmlBody, textBody, maxRetries = 2 }) {
  if (!process.env.EMAIL_USER) {
    throw new Error('EMAIL_USER not configured');
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

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
      });
      console.log(`✅ Email sent to ${to} id=${res.data && res.data.id}`);
      return { success: true, id: res.data && res.data.id };
    } catch (err) {
      lastErr = err;
      console.warn(`Email attempt ${attempt} failed:`, err && err.message ? err.message : err);
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return { success: false, error: lastErr && (lastErr.message || String(lastErr)) };
}

// -----------------------
// Routes
// -----------------------
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

// -----------------------
// Popup handler
// -----------------------
app.post('/api/popup-form', async (req, res) => {
  try {
    console.log('📩 /api/popup-form payload:', req.body);
    const name = normalizeName(req.body);
    const email = (req.body && req.body.email) || '';
    const phone = (req.body && req.body.phone) || '';
    const message = (req.body && req.body.message) || '';

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const timestampLocal = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const uniq = randomUUID().slice(0, 8);
    const subject = `[Popup] Homepage Inquiry — ${name} — ${timestampLocal} — ${uniq}`;

    console.log('Popup subject ->', subject);

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;border-radius:8px;text-align:center;color:#fff;">
          <h2 style="margin:6px 0">🔥 New Popup Inquiry (Homepage)</h2>
        </div>
        <div style="background:#fff;padding:16px;border-radius:6px;margin-top:12px;color:#333">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
          ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
          <hr/>
          <p style="font-size:12px;color:#888">Submitted on ${timestampLocal} — Source: Homepage Popup Form — Ref: ${uniq}</p>
        </div>
      </div>
    `;

    const userHtml = `<h2>Hi ${name} 👋</h2><p>Thanks for contacting Soundabode. We received your inquiry and will reply within 24 hours.</p>`;

    // Send admin (blocking)
    const adminRes = await sendEmail({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      htmlBody: adminHtml,
      textBody: `Popup inquiry from ${name}`
    });
    if (!adminRes.success) throw new Error(adminRes.error || 'Admin email failed');

    // Send user (best-effort)
    try {
      await sendEmail({
        to: email,
        subject: `Thanks — Soundabode received your popup inquiry`,
        htmlBody: userHtml,
        textBody: `Thanks ${name}, we'll get back to you.`
      });
    } catch (err) {
      console.warn('Non-blocking: user popup email failed:', err && err.message ? err.message : err);
    }

    return res.status(200).json({ success: true, message: 'Popup inquiry received', ref: uniq });
  } catch (err) {
    console.error('Popup error:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Failed to process popup' });
  }
});

// -----------------------
// Contact handler
// -----------------------
app.post('/api/contact-form', async (req, res) => {
  try {
    console.log('📩 /api/contact-form payload:', req.body);
    const fullName = (req.body && (req.body.fullName || req.body.fullname || req.body.name)) || '';
    const email = (req.body && req.body.email) || '';
    const phone = (req.body && req.body.phone) || '';
    const course = (req.body && req.body.course) || '';
    const message = (req.body && req.body.message) || '';

    if (!fullName || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const isCourse = Boolean(course && String(course).trim() !== '');
    const formattedCourse = isCourse ? formatCourseName(course) : 'N/A';
    const enquiryType = isCourse ? 'Course Enquiry' : 'General Enquiry';

    const timestampLocal = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const uniq = randomUUID().slice(0, 8);
    const subject = isCourse
      ? `[Contact] Course Enquiry — ${formattedCourse} — ${fullName} — ${timestampLocal} — ${uniq}`
      : `[Contact] General Enquiry — ${fullName} — ${timestampLocal} — ${uniq}`;

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
          <p style="font-size:12px;color:#888">Submitted on ${timestampLocal} — Source: Contact Page Form — Ref: ${uniq}</p>
        </div>
      </div>
    `;

    // Send admin email
    const adminRes = await sendEmail({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      htmlBody: adminHtml,
      textBody: `Contact enquiry: ${fullName}`
    });
    if (!adminRes.success) throw new Error(adminRes.error || 'Admin email failed');

    // user autoresponse (best-effort)
    try {
      const userSubject = `Soundabode — We've received your enquiry (${uniq})`;
      const userHtml = `<h2>Hi ${fullName}</h2><p>Thanks for contacting Soundabode. We'll reply within 24 hours. Ref: ${uniq}</p>`;
      await sendEmail({ to: email, subject: userSubject, htmlBody: userHtml, textBody: `Thanks ${fullName}, ref ${uniq}` });
    } catch (err) {
      console.warn('Non-blocking: user contact email failed:', err && err.message ? err.message : err);
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully!', ref: uniq });
  } catch (err) {
    console.error('Contact error:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Failed to send. Please try again.' });
  }
});

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// Start
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('✅ Soundabode Backend Server Running');
  console.log(`🌐 Port: ${PORT}`);
  console.log('📧 Email Provider: Gmail API (Direct)');
  console.log('🔒 CORS Allowed Origins:', allowedOrigins.join(', '));
  console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
  console.log('='.repeat(60));
});
