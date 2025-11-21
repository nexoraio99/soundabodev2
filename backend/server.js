// server.js - Soundabode Backend (fixed root causes, Gmail-only, non-blocking email queue)
// Usage: set env vars: PORT, EMAIL_USER, EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, EMAIL_REFRESH_TOKEN, ADMIN_EMAIL, CORS_ORIGINS

import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ------------------- Configuration -------------------
const PHONE_NUMBER = '+919975016189';
const WHATSAPP_NUMBER = '919975016189';
const COMPANY_NAME = 'Soundabode Academy';
const COMPANY_ADDRESS = 'Shop No. 218, Vision 9 Mall, Pimple Saudagar, Pune 411027';
const WEBSITE_URL = 'https://soundabode.com';
const LOGO_URL = 'https://res.cloudinary.com/di5bqvkma/image/upload/v1761233576/sa-logo_edited_vycsd0.png';

// Local path for the uploaded screenshot (from your conversation)
// developer note: use this path in admin UI/logging if you want to reference the uploaded image
const UPLOADED_FILE_PATH = '/mnt/data/Screenshot 2025-11-07 at 4.18.15 PM.png';

// ------------------- Basic security & parsers -------------------
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '200kb' }));
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

// ------------------- CORS -------------------
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

app.use((req, res, next) => {
  const origin = req.get('Origin') || req.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
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

if (process.env.EMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH_TOKEN });
}

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ------------------- Token caching -------------------
let cachedToken = null;
async function getAccessTokenCached() {
  const now = Date.now();
  if (cachedToken && cachedToken.token && cachedToken.expiry && (cachedToken.expiry - now > 30 * 1000)) {
    return cachedToken.token;
  }
  try {
    const res = await oauth2Client.getAccessToken();
    const token = (res && res.token) ? res.token : (typeof res === 'string' ? res : null);
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

// ------------------- Email templates (plug your rich ones here) -------------------
function getBaseEmailTemplate({ title, content, footerNote = '' }) {
  return `
  <!doctype html>
  <html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;background:#f4f6f8;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table width="600" style="background:#fff;border-radius:8px;overflow:hidden;margin:24px;">
        <tr style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;">
          <td style="padding:20px;text-align:center;">
            <img src="${LOGO_URL}" alt="${COMPANY_NAME}" style="height:40px;display:block;margin:0 auto 8px;">
            <h2 style="margin:0">${title}</h2>
          </td>
        </tr>
        <tr><td style="padding:24px;">${content}</td></tr>
        <tr><td style="padding:16px;background:#f8f9fa;font-size:13px;color:#6c757d;">
          ${footerNote ? `<div style="margin-bottom:8px">${footerNote}</div>` : ''}
          <div><strong>${COMPANY_NAME}</strong> — ${COMPANY_ADDRESS}<br/>
          <a href="tel:${PHONE_NUMBER}">${PHONE_NUMBER}</a> | <a href="${WEBSITE_URL}">${WEBSITE_URL}</a></div>
        </td></tr>
      </table>
    </td></tr></table>
  </body>
  </html>
  `;
}

function getAdminContactEmail({ fullName, email, phone, course, message, timestamp, ref, isCourse }) {
  const courseDisplay = course || 'N/A';
  const enquiryType = isCourse ? 'Course Enquiry' : 'General Enquiry';
  const content = `
    <div style="padding:12px">
      <p><strong>${enquiryType}</strong></p>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
      ${isCourse ? `<p><strong>Course:</strong> ${courseDisplay}</p>` : ''}
      ${message ? `<p><strong>Message:</strong><br>${message}</p>` : ''}
      <p style="font-size:12px;color:#888">Submitted: ${timestamp} — Ref: ${ref}</p>
      <p style="font-size:12px;color:#888">Uploaded file (if needed): ${UPLOADED_FILE_PATH}</p>
    </div>
  `;
  return getBaseEmailTemplate({ title: `New ${enquiryType}`, content, footerNote: `Ref: ${ref}` });
}

function getUserContactEmail({ fullName, course, ref, isCourse }) {
  const content = `
    <div>
      <h3>Hi ${fullName} 👋</h3>
      <p>Thanks for contacting ${COMPANY_NAME}. ${isCourse ? `We've received your interest in <strong>${course}</strong>.` : 'We received your message.'}</p>
      <p>One of our advisors will contact you within 24 hours. Your reference number is <strong>${ref}</strong>.</p>
      <p>If urgent, call us at <a href="tel:${PHONE_NUMBER}">${PHONE_NUMBER}</a> or message on WhatsApp.</p>
    </div>
  `;
  return getBaseEmailTemplate({ title: `Thanks  ${COMPANY_NAME}`, content, footerNote: 'We will get back to you shortly.' });
}

function getAdminPopupEmail({ fullName, email, phone, message, timestamp, ref }) {
  const content = `
    <div>
      <p><strong>Homepage Popup Inquiry</strong></p>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
      ${message ? `<p><strong>Message:</strong><br>${message}</p>` : ''}
      <p style="font-size:12px;color:#888">Submitted: ${timestamp} — Ref: ${ref}</p>
      <p style="font-size:12px;color:#888">Uploaded file: ${UPLOADED_FILE_PATH}</p>
    </div>
  `;
  return getBaseEmailTemplate({ title: 'New Popup Inquiry', content, footerNote: `Ref: ${ref}` });
}

function getUserPopupEmail({ fullName, ref }) {
  const content = `
    <div>
      <h3>Hi ${fullName} 👋</h3>
      <p>Thanks for your interest in ${COMPANY_NAME}. We've received your inquiry (Ref: <strong>${ref}</strong>) and will respond within 24 hours.</p>
      <p>If urgent, call <a href="tel:${PHONE_NUMBER}">${PHONE_NUMBER}</a>.</p>
    </div>
  `;
  return getBaseEmailTemplate({ title: 'Thanks for Reaching Out!', content, footerNote: '' });
}

// ------------------- Utility helpers -------------------
function buildRawMessage({ from, to, subject, htmlBody }) {
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
    htmlBody || ''
  ];
  return Buffer.from(parts.join('\r\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => timer = setTimeout(() => reject(new Error('Timeout')), ms))
  ]).finally(() => clearTimeout(timer));
}

// ------------------- Simple in-memory job queue + worker -------------------
const JOB_QUEUE = [];
let workerActive = false;
const WORKER_CONCURRENCY = 2;
const MAX_RETRIES = 3;

function enqueueJob(job) {
  job.id = job.id || randomUUID();
  job.attempts = job.attempts || 0;
  JOB_QUEUE.push(job);
  console.log('📥 Job enqueued', job.id, 'type=', job.type || 'email', 'queueLen=', JOB_QUEUE.length);
  if (!workerActive) startWorker();
}

function backoffMs(attempt) {
  return Math.min(5000, Math.pow(2, attempt) * 200); // 200ms, 400ms, 800ms, etc up to 5s
}

async function startWorker() {
  if (workerActive) return;
  workerActive = true;
  console.log('▶️ Email worker starting');

  async function loop() {
    while (JOB_QUEUE.length > 0) {
      const running = [];
      while (running.length < WORKER_CONCURRENCY && JOB_QUEUE.length > 0) {
        const job = JOB_QUEUE.shift();
        running.push(processJob(job).finally(() => {
          // noop — handled by processJob
        }));
      }
      try {
        await Promise.allSettled(running);
      } catch (e) {
        // ignore, processJob handles errors
      }
      // small pause
      await new Promise(r => setTimeout(r, 200));
    }
    workerActive = false;
    console.log('⏹ Email worker idle');
  }

  loop().catch(err => {
    workerActive = false;
    console.error('Worker crashed:', err && err.message ? err.message : err);
  });
}

async function processJob(job) {
  job.attempts = job.attempts || 0;
  job.attempts++;
  console.log(`🔁 Processing job ${job.id} attempt ${job.attempts}`);
  try {
    // always use Gmail API here
    // ensure cached token is set
    const token = await getAccessTokenCached();
    if (token) {
      oauth2Client.setCredentials({ access_token: token, refresh_token: process.env.EMAIL_REFRESH_TOKEN });
    }

    const raw = buildRawMessage({
      from: `"${COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
      to: job.to,
      subject: job.subject,
      htmlBody: job.html
    });

    const start = Date.now();
    // send with per-send timeout (5s)
    const res = await withTimeout(gmail.users.messages.send({ userId: 'me', requestBody: { raw } }), 5000);
    console.log(`✅ Job ${job.id} sent to ${job.to} (${Date.now() - start}ms) id=${res.data && res.data.id}`);
    return { success: true, id: res.data && res.data.id };
  } catch (err) {
    console.warn(`⚠️ Job ${job.id} failed attempt ${job.attempts}:`, err && err.message ? err.message : err);
    if (err && (err.code === 401 || err.code === 403)) {
      cachedToken = null; // force token refresh next time
    }
    if (job.attempts < (job.maxRetries || MAX_RETRIES)) {
      const delay = backoffMs(job.attempts);
      console.log(`↩️ Re-enqueueing job ${job.id} after ${delay}ms`);
      setTimeout(() => enqueueJob(job), delay);
    } else {
      console.error(`❌ Job ${job.id} permanently failed after ${job.attempts} attempts`);
      // TODO: persist failure to DB or alerting
    }
    throw err;
  }
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

// ------------------- Popup handler (fast) -------------------
app.post('/api/popup-form', (req, res) => {
  try {
    const start = Date.now();
    console.log('📩 /api/popup-form payload:', req.body);
    const fullName = (req.body && (req.body.fullName || req.body.fullname || req.body.name)) || '';
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
    const ref = randomUUID().slice(0, 8).toUpperCase();
    const subject = `[Popup] Homepage Inquiry — ${fullName} — ${ref}`;

    // build templates
    const adminHtml = getAdminPopupEmail({ fullName, email, phone, message, timestamp: timestampLocal, ref });
    const userHtml = getUserPopupEmail({ fullName, ref });

    // enqueue admin + user messages (non-blocking)
    enqueueJob({
      type: 'admin',
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      html: adminHtml,
      maxRetries: 4
    });

    enqueueJob({
      type: 'user',
      to: email,
      subject: `Thanks — ${COMPANY_NAME}`,
      html: userHtml,
      maxRetries: 2
    });

    // immediate response
    res.status(200).json({ success: true, message: 'Popup inquiry received', ref });
    console.log('popup handler elapsed ms:', Date.now() - start);
  } catch (err) {
    console.error('Popup error:', err && err.message ? err.message : err);
    res.status(500).json({ success: false, message: 'Failed to process popup form' });
  }
});

// ------------------- Contact handler (fast) -------------------
app.post('/api/contact-form', (req, res) => {
  try {
    const start = Date.now();
    console.log('📩 /api/contact-form payload:', req.body);
    const fullName = (req.body && (req.body.fullName || req.body.fullname || req.body.name)) || '';
    const email = (req.body && req.body.email) ? String(req.body.email).trim() : '';
    const phone = (req.body && req.body.phone) ? String(req.body.phone).trim() : '';
    const course = (req.body && req.body.course) ? String(req.body.course).trim() : '';
    const message = (req.body && req.body.message) ? String(req.body.message).trim() : '';

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
    const ref = randomUUID().slice(0, 8).toUpperCase();
    const subject = isCourse
      ? `[Contact] Course Enquiry — ${formattedCourse} — ${ref}`
      : `[Contact] General Enquiry — ${fullName} — ${ref}`;

    const adminHtml = getAdminContactEmail({
      fullName,
      email,
      phone,
      course: formattedCourse,
      message,
      timestamp: timestampLocal,
      ref,
      isCourse
    });

    const userHtml = getUserContactEmail({ fullName, course: formattedCourse, ref, isCourse });

    // enqueue admin
    enqueueJob({
      type: 'admin',
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      html: adminHtml,
      maxRetries: 4
    });

    // enqueue user autoresponse
    enqueueJob({
      type: 'user',
      to: email,
      subject: `${COMPANY_NAME} — We've received your enquiry!`,
      html: userHtml,
      maxRetries: 2
    });

    // immediate response
    res.status(200).json({ success: true, message: 'Message received', ref });
    console.log('contact handler elapsed ms:', Date.now() - start);
  } catch (err) {
    console.error('Contact error:', err && err.message ? err.message : err);
    res.status(500).json({ success: false, message: 'Failed to send. Please try again.' });
  }
});

// ------------------- 404 -------------------
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// ------------------- Start server -------------------
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('✅ Soundabode Backend Server Running');
  console.log(`🌐 Port: ${PORT}`);
  console.log('📧 Email Provider: Gmail API (Direct)');
  console.log(`📱 WhatsApp: ${WHATSAPP_NUMBER}`);
  console.log(`☎️  Phone: ${PHONE_NUMBER}`);
  console.log('🔒 CORS Allowed Origins:', allowedOrigins.join(', '));
  console.log('📎 Uploaded file path:', UPLOADED_FILE_PATH);
  console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
  console.log('='.repeat(60));
});

// ------------------- Utility functions used above -------------------
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
