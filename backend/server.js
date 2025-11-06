// server.js - Soundabode Backend with Gmail API (Direct Send)
// Usage: set env vars: PORT, CORS_ORIGINS, EMAIL_USER, EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, EMAIL_REFRESH_TOKEN, ADMIN_EMAIL (optional)
// Note: CORS_ORIGINS should be comma separated, e.g. "https://soundabode.com,https://www.soundabode.com"
// For local dev you can include localhost in CORS_ORIGINS, but remove it in production.

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

// ============================================================================
// Helper: parse allowed origins from ENV
// ============================================================================
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ============================================================================
// Middleware & Security
// ============================================================================
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '150kb' }));
app.use(express.urlencoded({ extended: true, limit: '150kb' }));

// Basic request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} Origin:${req.get('origin') || 'none'}`);
  next();
});

// Rate limiter - tune as needed
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later.' }
});
app.use('/api/', limiter);

// ============================================================================
// CORS - strict function-based allowlist
// ============================================================================
const corsOptions = {
  origin: function (origin, callback) {
    // If browser request (has origin) -> enforce allowlist
    if (origin) {
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.warn(`CORS denied request from origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
      }
    }
    // No origin (server-to-server, curl, Postman) -> disallow by CORS but allow requests to reach server to be auth-checked
    // Returning false here prevents browser CORS acceptance. Non-browser clients don't use CORS.
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  optionsSuccessStatus: 200
};

// Apply CORS to routes
app.options('*', cors(corsOptions)); // preflight handler
app.use((req, res, next) => {
  cors(corsOptions)(req, res, err => {
    if (err) {
      // Send explicit CORS denied response for browser clients
      return res.status(403).json({ error: 'CORS origin denied' });
    }
    next();
  });
});

// ============================================================================
// Gmail API setup (OAuth2 client using refresh token)
// ============================================================================
console.log('\n📧 Configuring Gmail API...');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅' : '❌ NOT SET');
console.log('EMAIL_CLIENT_ID:', process.env.EMAIL_CLIENT_ID ? '✅' : '❌ NOT SET');
console.log('EMAIL_CLIENT_SECRET:', process.env.EMAIL_CLIENT_SECRET ? '✅' : '❌ NOT SET');
console.log('EMAIL_REFRESH_TOKEN:', process.env.EMAIL_REFRESH_TOKEN ? '✅' : '❌ NOT SET');

const oauth2Client = new google.auth.OAuth2(
  process.env.EMAIL_CLIENT_ID,
  process.env.EMAIL_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // redirect is not used for direct sending; refresh token already obtained
);

if (process.env.EMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH_TOKEN });
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ============================================================================
// Helper: create message with optional headers (Message-ID, Date). Unique subject to avoid Gmail threading.
// ============================================================================
function buildRawEmail({ from, to, subject, htmlBody, textBody }) {
  const msgId = `<${randomUUID()}@soundabode.local>`;
  const dateStr = new Date().toUTCString();

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Message-ID: ${msgId}`,
    `Date: ${dateStr}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody || textBody || ''
  ].join('\r\n');

  // base64url encode
  return Buffer.from(headers)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// ============================================================================
// Helper: send email (single attempt, immediate). Returns result or throws.
// ============================================================================
async function sendEmail({ to, subject, htmlBody, textBody }) {
  if (!process.env.EMAIL_USER) throw new Error('EMAIL_USER env not set');
  // Build raw
  const raw = buildRawEmail({
    from: `"Soundabode Academy" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    htmlBody,
    textBody
  });

  // Gmail send
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw
    }
  });

  return res.data; // includes id
}

// ============================================================================
// Utility: format course code to human-friendly
// ============================================================================
function formatCourseName(courseValue) {
  const courseMap = {
    'dj-training': 'DJ Training',
    'music-production': 'Music Production',
    'audio-engineering': 'Audio Engineering'
  };
  return courseMap[courseValue] || courseValue || 'N/A';
}

// ============================================================================
// Root & Health
// ============================================================================
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Soundabode Backend Server',
    timestamp: new Date().toISOString(),
    emailProvider: 'Gmail API (Direct)',
    endpoints: { popupForm: '/api/popup-form', contactForm: '/api/contact-form', health: '/health' },
    configured: !!(process.env.EMAIL_USER && process.env.EMAIL_CLIENT_ID && process.env.EMAIL_CLIENT_SECRET && process.env.EMAIL_REFRESH_TOKEN)
  });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

// ============================================================================
// POPUP FORM - /api/popup-form
// ============================================================================
app.post('/api/popup-form', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body || {};

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Name, email and phone are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, message: 'Invalid email format' });

    // prepare distinct subjects (includes timestamp to avoid threading)
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const uniqueTag = randomUUID().slice(0, 8);
    const adminSubject = `🔔 [Popup] Homepage Inquiry — ${name} — ${timestamp} — ${uniqueTag}`;
    const userSubject = `Thanks for contacting Soundabode! (Homepage Popup) — ${uniqueTag}`;

    const adminHtml = `
      <h2>🔥 New Popup Inquiry (Homepage)</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
      <p><small>Submitted at ${timestamp}</small></p>
    `;

    const userHtml = `
      <h2>Hi ${name} — thanks for reaching out!</h2>
      <p>We've received your inquiry and will get back to you within 24 hours.</p>
      <p><small>Reference: ${uniqueTag}</small></p>
    `;

    // Send admin email (primary). Throws on error.
    await sendEmail({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: adminSubject,
      htmlBody: adminHtml,
      textBody: `Popup inquiry from ${name} (${email})`
    });

    // Send user autoresponse. If this fails, we don't fail the whole request; just log.
    try {
      await sendEmail({
        to: email,
        subject: userSubject,
        htmlBody: userHtml,
        textBody: `Thanks ${name}, we've received your inquiry.`
      });
    } catch (userSendErr) {
      console.warn('User autoresponse failed:', userSendErr.message);
    }

    return res.status(200).json({ success: true, message: "Thank you! We'll contact you within 24 hours.", reference: uniqueTag });

  } catch (err) {
    console.error('Popup form error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to submit. Please try again or call +91 997 501 6189' });
  }
});

// ============================================================================
// CONTACT FORM - /api/contact-form
// ============================================================================
app.post('/api/contact-form', async (req, res) => {
  try {
    const { fullName, email, phone, course, message } = req.body || {};

    if (!fullName || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ success: false, message: 'Invalid email format' });

    const isCourseEnquiry = Boolean(course && course.trim());
    const formattedCourse = isCourseEnquiry ? formatCourseName(course) : 'N/A';
    const enquiryType = isCourseEnquiry ? 'Course Enquiry' : 'General Enquiry';

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const uniqueTag = randomUUID().slice(0, 8);

    const adminSubject = `${isCourseEnquiry ? '🎓' : '📧'} [Contact] ${enquiryType} — ${fullName} — ${timestamp} — ${uniqueTag}`;
    const userSubject = `Thank you for contacting Soundabode${isCourseEnquiry ? ` — ${formattedCourse}` : ''} — ${uniqueTag}`;

    const adminHtml = `
      <h2>${isCourseEnquiry ? '🎓' : '📧'} New ${enquiryType}</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
      ${isCourseEnquiry ? `<p><strong>Course:</strong> ${formattedCourse}</p>` : ''}
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
      <p><small>Submitted at ${timestamp}</small></p>
    `;

    // Send to admin
    await sendEmail({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: adminSubject,
      htmlBody: adminHtml,
      textBody: `New ${enquiryType} — ${fullName}`
    });

    // Send user email (best-effort)
    try {
      await sendEmail({
        to: email,
        subject: userSubject,
        htmlBody: `<h2>Hi ${fullName}!</h2><p>Thanks for your ${enquiryType.toLowerCase()}. We'll respond within 24 hours.</p><p><small>Ref: ${uniqueTag}</small></p>`,
        textBody: `Hi ${fullName}, thanks for contacting Soundabode. Ref: ${uniqueTag}`
      });
    } catch (userErr) {
      console.warn('Contact form user mail failed:', userErr.message);
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully!', reference: uniqueTag });
  } catch (err) {
    console.error('Contact form error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send. Please try again.' });
  }
});

// 404
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err && err.message ? err.message : err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================================
// START
// ============================================================================
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('✅ Soundabode Backend Server Running');
  console.log(`🌐 Port: ${PORT}`);
  console.log('📧 Email Provider: Gmail API (Direct)');
  console.log('🔒 CORS Allowed Origins:', allowedOrigins.length ? allowedOrigins.join(', ') : '(none)');
  console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
  console.log('='.repeat(60));
});
