// server.js - Soundabode Backend (fast, non-blocking email delivery + optional SendGrid)
// Usage: set env vars: PORT, EMAIL_USER, EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET,
// EMAIL_REFRESH_TOKEN, ADMIN_EMAIL, CORS_ORIGINS, SENDGRID_API_KEY (optional)

import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';

dotenv.config();

// Optional SendGrid (fast transactional provider)
let sgMail = null;
if (process.env.SENDGRID_API_KEY) {
  try {
    // lazy import so module is optional
    // eslint-disable-next-line no-var
    var sendgrid = await import('@sendgrid/mail');
    sgMail = sendgrid.default;
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid enabled');
  } catch (e) {
    console.warn('⚠️ SendGrid lib not installed or failed to load:', e && e.message ? e.message : e);
    sgMail = null;
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ------------------- App constants -------------------
const PHONE_NUMBER = '+919975016189';
const WHATSAPP_NUMBER = '919975016189';
const COMPANY_NAME = 'Soundabode Academy';
const COMPANY_ADDRESS = 'Shop No. 218, Vision 9 Mall, Pimple Saudagar, Pune 411027';
const WEBSITE_URL = 'https://soundabode.com';
const LOGO_URL = 'https://res.cloudinary.com/di5bqvkma/image/upload/v1761233576/sa-logo_edited_vycsd0.png';

// Uploaded file path (from your conversation history)
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
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(',')).split(',').map(s => s.trim()).filter(Boolean);
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

// ------------------- Email templates (kept short here) -------------------
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

// Minimal example templates — you can re-use your rich templates
function getAdminHtml(shortInfo) {
  return `<div><h3>New inquiry</h3><pre>${JSON.stringify(shortInfo,null,2)}</pre></div>`;
}
function getUserHtml(fullName, ref) {
  return `<div><h3>Hi ${fullName}</h3><p>Thanks for contacting ${COMPANY_NAME}. Ref: ${ref}</p></div>`;
}

// ------------------- Helper: timeout wrapper -------------------
function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => timer = setTimeout(() => reject(new Error('Timeout')), ms))
  ]).finally(() => clearTimeout(timer));
}

// ------------------- In-memory job queue (simple) -------------------
const JOBS = [];
let workerRunning = false;
const WORKER_CONCURRENCY = 2;
const MAX_RETRIES = 3;

function enqueueEmailJob(job) {
  job.id = job.id || randomUUID();
  job.attempts = job.attempts || 0;
  JOBS.push(job);
  console.log('📥 Enqueued email job', job.id, 'queueLen=', JOBS.length);
  // start worker if not running
  if (!workerRunning) startWorker();
}

// Simple worker that processes jobs with concurrency
async function startWorker() {
  if (workerRunning) return;
  workerRunning = true;
  console.log('▶️ Email worker started');
  const active = new Set();

  async function tryProcess() {
    while (JOBS.length > 0 && active.size < WORKER_CONCURRENCY) {
      const job = JOBS.shift();
      active.add(job.id);
      processJob(job)
        .then(() => {
          active.delete(job.id);
        })
        .catch(() => {
          active.delete(job.id);
        });
    }
    if (JOBS.length === 0 && active.size === 0) {
      // no more work
      workerRunning = false;
      console.log('⏹ Email worker idle');
      return;
    }
    // wait briefly then continue
    await new Promise(r => setTimeout(r, 300));
    if (!workerRunning) return;
    tryProcess();
  }

  tryProcess();
}

// exponential backoff ms
function backoffMs(attempt) {
  return Math.min(5000, Math.pow(2, attempt) * 250); // 250ms, 500ms, 1000ms, ...
}

// ------------------- Sending implementations -------------------
async function sendWithSendGrid({ to, subject, html, text }) {
  if (!sgMail) throw new Error('SendGrid not configured or package missing');
  const msg = {
    to,
    from: process.env.EMAIL_USER,
    subject,
    html,
    text: text || ''
  };
  const t0 = Date.now();
  await withTimeout(sgMail.send(msg), 5000); // 5s timeout on provider call
  console.log(`✉️ SendGrid send to ${to} in ${Date.now() - t0}ms`);
  return { success: true };
}

async function sendWithGmailRaw({ to, subject, html }) {
  const token = await getAccessTokenCached();
  if (token) {
    oauth2Client.setCredentials({ access_token: token, refresh_token: process.env.EMAIL_REFRESH_TOKEN });
  }
  const raw = buildRawMessage({
    from: `"${COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    htmlBody: html
  });
  const t0 = Date.now();
  // put a per-send timeout to avoid hanging
  const res = await withTimeout(gmail.users.messages.send({ userId: 'me', requestBody: { raw } }), 5000);
  console.log(`✉️ Gmail send to ${to} id=${res.data && res.data.id} (${Date.now() - t0}ms)`);
  return { success: true, id: res.data && res.data.id };
}

// unified send function: tries SendGrid first (if configured), otherwise Gmail
async function sendEmailProvider({ to, subject, html, text }) {
  if (sgMail) {
    return sendWithSendGrid({ to, subject, html, text });
  } else {
    return sendWithGmailRaw({ to, subject, html });
  }
}

// ------------------- Job processor -------------------
async function processJob(job) {
  const { to, subject, html, text } = job;
  job.attempts = job.attempts || 0;
  try {
    job.attempts++;
    console.log(`🔁 Processing job ${job.id} attempt ${job.attempts}`);
    const res = await sendEmailProvider({ to, subject, html, text });
    console.log(`✅ Job ${job.id} succeeded -> ${to}`);
    return res;
  } catch (err) {
    console.warn(`⚠️ Job ${job.id} attempt ${job.attempts} failed:`, err && err.message ? err.message : err);
    if (job.attempts < (job.maxRetries || MAX_RETRIES)) {
      const delay = backoffMs(job.attempts);
      console.log(`↩️ Re-enqueueing job ${job.id} after ${delay}ms`);
      setTimeout(() => enqueueEmailJob(job), delay);
    } else {
      console.error(`❌ Job ${job.id} permanently failed after ${job.attempts} attempts`);
      // persist to logs or send alert here (e.g., to Slack / Ops)
    }
    throw err;
  }
}

// ------------------- Utilities & Templates (use your rich ones if you want) -------------------
function simpleAdminHtml(info) {
  return `<div style="font-family:Arial,sans-serif"><h2>New Inquiry</h2><pre>${JSON.stringify(info,null,2)}</pre></div>`;
}
function simpleUserHtml(name, ref) {
  return `<div style="font-family:Arial,sans-serif"><h2>Hi ${name}</h2><p>Thanks! Ref: ${ref}</p></div>`;
}

// ------------------- Routes -------------------
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Soundabode Backend',
    timestamp: new Date().toISOString(),
    endpoints: { popupForm: '/api/popup-form', contactForm: '/api/contact-form', health: '/health' },
    configured: {
      emailUser: !!process.env.EMAIL_USER,
      sendgrid: !!process.env.SENDGRID_API_KEY
    },
    uploadedFile: UPLOADED_FILE_PATH
  });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));

// ------------------- POPUP FORM (fast, non-blocking) -------------------
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

    // Build email payloads (use your full templates if you prefer)
    const adminHtml = getAdminPopupEmail
      ? getAdminPopupEmail({ fullName, email, phone, message, timestamp: timestampLocal, ref })
      : simpleAdminHtml({ fullName, email, phone, message, timestampLocal, ref });

    const userHtml = getUserPopupEmail
      ? getUserPopupEmail({ fullName, ref })
      : simpleUserHtml(fullName, ref);

    // Enqueue admin job (non-blocking)
    enqueueEmailJob({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      html: adminHtml,
      text: `Popup inquiry from ${fullName} (${email}, ${phone})`,
      maxRetries: 4
    });

    // Enqueue user autoresponse (non-blocking)
    enqueueEmailJob({
      to: email,
      subject: `Thanks for your interest in ${COMPANY_NAME}!`,
      html: userHtml,
      text: `Thanks ${fullName}, ref ${ref}`,
      maxRetries: 2
    });

    // Immediate response to client (fast)
    res.status(200).json({ success: true, message: 'Popup inquiry received', ref });

    console.log('handler elapsed ms:', Date.now() - start);
  } catch (err) {
    console.error('Popup handler error:', err && err.message ? err.message : err);
    res.status(500).json({ success: false, message: 'Failed to process popup form' });
  }
});

// ------------------- CONTACT FORM (fast, non-blocking) -------------------
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

    const adminHtml = getAdminContactEmail
      ? getAdminContactEmail({ fullName, email, phone, course: formattedCourse, message, timestamp: timestampLocal, ref, isCourse })
      : simpleAdminHtml({ fullName, email, phone, course: formattedCourse, message, timestamp: timestampLocal, ref });

    const userHtml = getUserContactEmail
      ? getUserContactEmail({ fullName, course: formattedCourse, ref, isCourse })
      : simpleUserHtml(fullName, ref);

    // Enqueue admin job
    enqueueEmailJob({
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject,
      html: adminHtml,
      text: `${enquiryType} from ${fullName} (${email}, ${phone})`,
      maxRetries: 4
    });

    // Enqueue user autoresponse
    enqueueEmailJob({
      to: email,
      subject: `${COMPANY_NAME} — We've received your enquiry!`,
      html: userHtml,
      text: `Hi ${fullName}, ref ${ref}`,
      maxRetries: 2
    });

    // Immediate response
    res.status(200).json({ success: true, message: 'Message received', ref });
    console.log('handler elapsed ms:', Date.now() - start);
  } catch (err) {
    console.error('Contact handler error:', err && err.message ? err.message : err);
    res.status(500).json({ success: false, message: 'Failed to process contact form' });
  }
});

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// Start
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('✅ Soundabode Backend Server Running');
  console.log(`🌐 Port: ${PORT}`);
  console.log('📧 Email Provider: Gmail API (Direct)' + (sgMail ? ' + SendGrid' : ''));
  console.log(`📱 WhatsApp: ${WHATSAPP_NUMBER}`);
  console.log(`☎️  Phone: ${PHONE_NUMBER}`);
  console.log('🔒 CORS Allowed Origins:', allowedOrigins.join(', '));
  console.log('📎 Uploaded file path:', UPLOADED_FILE_PATH);
  console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
  console.log('='.repeat(60));
});
