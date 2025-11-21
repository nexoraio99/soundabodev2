// server.js - Soundabode Backend with Enhanced Email Templates
// Usage: set EMAIL_USER, EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, EMAIL_REFRESH_TOKEN, ADMIN_EMAIL, CORS_ORIGINS

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

// ------------------- TOKEN CACHING -------------------
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

// ------------------- Email Template Helpers -------------------

// Base email template with modern design
function getBaseEmailTemplate({ title, content, footerNote = '' }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f4f4f7;line-height:1.6;">
      <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#f4f4f7;padding:40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Container -->
            <table role="presentation" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
              
              <!-- Header with Logo -->
              <tr>
                <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 24px;text-align:center;">
                  <img src="${LOGO_URL}" alt="${COMPANY_NAME}" style="height:50px;width:auto;margin-bottom:16px;">
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">${title}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding:40px 32px;">
                  ${content}
                </td>
              </tr>
              
              <!-- Action Buttons -->
              <tr>
                <td style="padding:0 32px 32px;">
                  <table role="presentation" style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding-right:8px;" width="50%">
                        <a href="https://wa.me/${WHATSAPP_NUMBER}" style="display:block;background-color:#25D366;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;text-align:center;font-weight:600;font-size:14px;">
                          <table role="presentation" style="width:100%;">
                            <tr>
                              <td align="center">
                                📱 WhatsApp
                              </td>
                            </tr>
                          </table>
                        </a>
                      </td>
                      <td style="padding-left:8px;" width="50%">
                        <a href="tel:${PHONE_NUMBER}" style="display:block;background-color:#667eea;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;text-align:center;font-weight:600;font-size:14px;">
                          <table role="presentation" style="width:100%;">
                            <tr>
                              <td align="center">
                                📞 Call Us
                              </td>
                            </tr>
                          </table>
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color:#f8f9fa;padding:24px 32px;border-top:1px solid #e9ecef;">
                  ${footerNote ? `<p style="margin:0 0 12px;color:#6c757d;font-size:13px;">${footerNote}</p>` : ''}
                  <p style="margin:0;color:#6c757d;font-size:13px;line-height:1.5;">
                    <strong>${COMPANY_NAME}</strong><br>
                    ${COMPANY_ADDRESS}<br>
                    <a href="tel:${PHONE_NUMBER}" style="color:#667eea;text-decoration:none;">${PHONE_NUMBER}</a> | 
                    <a href="${WEBSITE_URL}" style="color:#667eea;text-decoration:none;">${WEBSITE_URL}</a>
                  </p>
                  <div style="margin-top:16px;">
                    <a href="https://www.instagram.com/soundabode" style="display:inline-block;margin:0 8px;text-decoration:none;">
                      <span style="color:#667eea;font-size:20px;">📷</span>
                    </a>
                    <a href="https://www.facebook.com/soundabode" style="display:inline-block;margin:0 8px;text-decoration:none;">
                      <span style="color:#667eea;font-size:20px;">📘</span>
                    </a>
                    <a href="https://www.youtube.com/@soundabode" style="display:inline-block;margin:0 8px;text-decoration:none;">
                      <span style="color:#667eea;font-size:20px;">📺</span>
                    </a>
                  </div>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Admin notification email for popup form
function getAdminPopupEmail({ fullName, email, phone, message, timestamp, ref }) {
  const content = `
    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.1) 0%,rgba(118,75,162,0.1) 100%);border-left:4px solid #667eea;padding:20px;border-radius:8px;margin-bottom:24px;">
      <h2 style="margin:0 0 8px;color:#667eea;font-size:18px;">🔥 New Homepage Popup Inquiry</h2>
      <p style="margin:0;color:#6c757d;font-size:14px;">Someone is interested in your courses!</p>
    </div>
    
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;">
          <strong style="color:#495057;font-size:14px;">Name:</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;text-align:right;">
          <span style="color:#212529;font-size:14px;">${fullName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;">
          <strong style="color:#495057;font-size:14px;">Email:</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;text-align:right;">
          <a href="mailto:${email}" style="color:#667eea;text-decoration:none;font-size:14px;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;">
          <strong style="color:#495057;font-size:14px;">Phone:</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;text-align:right;">
          <a href="tel:${phone}" style="color:#667eea;text-decoration:none;font-size:14px;">${phone}</a>
        </td>
      </tr>
      ${message ? `
      <tr>
        <td colspan="2" style="padding:12px 0;">
          <strong style="color:#495057;font-size:14px;">Message:</strong>
          <p style="margin:8px 0 0;color:#212529;font-size:14px;background-color:#f8f9fa;padding:12px;border-radius:6px;">${message}</p>
        </td>
      </tr>
      ` : ''}
    </table>
    
    <div style="margin-top:24px;padding:16px;background-color:#fff3cd;border-radius:8px;border-left:4px solid #ffc107;">
      <p style="margin:0;color:#856404;font-size:13px;">
        <strong>Quick Actions:</strong> Click WhatsApp or Call buttons below to contact ${fullName} immediately!
      </p>
    </div>
  `;
  
  const footerNote = `Submitted: ${timestamp} | Source: Homepage Popup | Ref: ${ref}`;
  
  return getBaseEmailTemplate({
    title: '🎉 New Popup Inquiry',
    content,
    footerNote
  });
}

// Admin notification email for contact form
function getAdminContactEmail({ fullName, email, phone, course, message, timestamp, ref, isCourse }) {
  const courseDisplay = course ? course : 'N/A';
  const enquiryIcon = isCourse ? '🎓' : '📧';
  const enquiryType = isCourse ? 'Course Enquiry' : 'General Enquiry';
  const gradientColor = isCourse ? 'rgba(76,175,80,0.1)' : 'rgba(102,126,234,0.1)';
  const borderColor = isCourse ? '#4CAF50' : '#667eea';
  
  const content = `
    <div style="background:linear-gradient(135deg,${gradientColor} 0%,${gradientColor} 100%);border-left:4px solid ${borderColor};padding:20px;border-radius:8px;margin-bottom:24px;">
      <h2 style="margin:0 0 8px;color:${borderColor};font-size:18px;">${enquiryIcon} New ${enquiryType}</h2>
      <p style="margin:0;color:#6c757d;font-size:14px;">Contact form submission from your website</p>
    </div>
    
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;">
          <strong style="color:#495057;font-size:14px;">Name:</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;text-align:right;">
          <span style="color:#212529;font-size:14px;">${fullName}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;">
          <strong style="color:#495057;font-size:14px;">Email:</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;text-align:right;">
          <a href="mailto:${email}" style="color:#667eea;text-decoration:none;font-size:14px;">${email}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;">
          <strong style="color:#495057;font-size:14px;">Phone:</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;text-align:right;">
          <a href="tel:${phone}" style="color:#667eea;text-decoration:none;font-size:14px;">${phone}</a>
        </td>
      </tr>
      ${isCourse ? `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;">
          <strong style="color:#495057;font-size:14px;">Course Interest:</strong>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;text-align:right;">
          <span style="background-color:${borderColor};color:#ffffff;padding:4px 12px;border-radius:16px;font-size:12px;font-weight:600;">${courseDisplay}</span>
        </td>
      </tr>
      ` : ''}
      ${message ? `
      <tr>
        <td colspan="2" style="padding:12px 0;">
          <strong style="color:#495057;font-size:14px;">Message:</strong>
          <p style="margin:8px 0 0;color:#212529;font-size:14px;background-color:#f8f9fa;padding:12px;border-radius:6px;">${message}</p>
        </td>
      </tr>
      ` : ''}
    </table>
    
    <div style="margin-top:24px;padding:16px;background-color:#d1ecf1;border-radius:8px;border-left:4px solid #17a2b8;">
      <p style="margin:0;color:#0c5460;font-size:13px;">
        <strong>Action Required:</strong> Use WhatsApp or Call buttons below to follow up with ${fullName} within 24 hours.
      </p>
    </div>
  `;
  
  const footerNote = `Submitted: ${timestamp} | Source: Contact Page | Ref: ${ref}`;
  
  return getBaseEmailTemplate({
    title: `${enquiryIcon} New ${enquiryType}`,
    content,
    footerNote
  });
}

// User autoresponse for popup form
function getUserPopupEmail({ fullName, ref }) {
  const content = `
    <h2 style="margin:0 0 16px;color:#212529;font-size:20px;">Hi ${fullName}! 👋</h2>
    
    <p style="margin:0 0 16px;color:#495057;font-size:15px;line-height:1.6;">
      Thank you for your interest in <strong>${COMPANY_NAME}</strong>!
    </p>
    
    <p style="margin:0 0 16px;color:#495057;font-size:15px;line-height:1.6;">
      We've received your inquiry and our team will get back to you <strong>within 24 hours</strong> with all the information you need.
    </p>
    
    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.1) 0%,rgba(118,75,162,0.1) 100%);padding:20px;border-radius:12px;margin:24px 0;">
      <h3 style="margin:0 0 12px;color:#667eea;font-size:16px;">🎵 What We Offer:</h3>
      <ul style="margin:0;padding-left:20px;color:#495057;font-size:14px;">
        <li style="margin-bottom:8px;">Professional DJ Training</li>
        <li style="margin-bottom:8px;">Music Production Courses</li>
        <li style="margin-bottom:8px;">Audio Engineering Programs</li>
        <li>Industry-Expert Instructors</li>
      </ul>
    </div>
    
    <p style="margin:0 0 16px;color:#495057;font-size:15px;line-height:1.6;">
      In the meantime, feel free to reach out directly via WhatsApp or call us if you have any urgent questions!
    </p>
    
    <div style="background-color:#f8f9fa;padding:16px;border-radius:8px;margin-top:24px;">
      <p style="margin:0;color:#6c757d;font-size:13px;">
        <strong>Reference Number:</strong> ${ref}<br>
        <em>Please save this reference number for your records.</em>
      </p>
    </div>
  `;
  
  return getBaseEmailTemplate({
    title: 'Thanks for Reaching Out!',
    content,
    footerNote: 'We look forward to helping you start your music journey! 🎧'
  });
}

// User autoresponse for contact form
function getUserContactEmail({ fullName, course, ref, isCourse }) {
  const courseText = isCourse ? `about our <strong>${course}</strong> course` : 'your inquiry';
  
  const content = `
    <h2 style="margin:0 0 16px;color:#212529;font-size:20px;">Hi ${fullName}! 👋</h2>
    
    <p style="margin:0 0 16px;color:#495057;font-size:15px;line-height:1.6;">
      Thank you for contacting <strong>${COMPANY_NAME}</strong> ${courseText}!
    </p>
    
    <p style="margin:0 0 16px;color:#495057;font-size:15px;line-height:1.6;">
      We've received your message and one of our course advisors will reach out to you <strong>within 24 hours</strong> to discuss:
    </p>
    
    <div style="background:linear-gradient(135deg,rgba(76,175,80,0.1) 0%,rgba(69,160,73,0.1) 100%);padding:20px;border-radius:12px;margin:24px 0;">
      <ul style="margin:0;padding-left:20px;color:#495057;font-size:14px;">
        <li style="margin-bottom:8px;">Course curriculum and schedule</li>
        <li style="margin-bottom:8px;">Pricing and payment options</li>
        <li style="margin-bottom:8px;">Next batch start dates</li>
        <li>Career opportunities after completion</li>
      </ul>
    </div>
    
    ${isCourse ? `
    <div style="border-left:4px solid #4CAF50;padding:16px;background-color:#f1f8f4;border-radius:8px;margin:24px 0;">
      <p style="margin:0;color:#2e7d32;font-size:14px;">
        <strong>🎓 Course Selected:</strong> ${course}
      </p>
    </div>
    ` : ''}
    
    <p style="margin:0 0 16px;color:#495057;font-size:15px;line-height:1.6;">
      Need immediate assistance? Use the buttons below to connect with us instantly!
    </p>
    
    <div style="background-color:#f8f9fa;padding:16px;border-radius:8px;margin-top:24px;">
      <p style="margin:0;color:#6c757d;font-size:13px;">
        <strong>Reference Number:</strong> ${ref}<br>
        <em>Please save this reference number for your records.</em>
      </p>
    </div>
  `;
  
  return getBaseEmailTemplate({
    title: 'We Got Your Message!',
    content,
    footerNote: 'Looking forward to helping you achieve your music production goals! 🎹'
  });
}

// ------------------- Utility Functions -------------------
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

// ------------------- Send email with retries -------------------
async function sendEmailRaw({ to, subject, htmlBody, textBody, maxRetries = 2 }) {
  if (!process.env.EMAIL_USER) throw new Error('EMAIL_USER not configured');

  try {
    const token = await getAccessTokenCached();
    if (token) {
      oauth2Client.setCredentials({ access_token: token, refresh_token: process.env.EMAIL_REFRESH_TOKEN });
    }
  } catch (err) {
    console.warn('⚠️ Could not set access token:', err && err.message ? err.message : err);
  }

  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = buildRawMessage({
        from: `"${COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
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
      console.log(`✅ Email sent to ${to} id=${res.data && res.data.id} (${Date.now() - t0}ms)`);
      return { success: true, id: res.data && res.data.id };
    } catch (err) {
      lastErr = err;
      console.warn(`Email attempt ${attempt} failed:`, err && err.message ? err.message : err);
      if (err && err.code && (err.code === 401 || err.code === 403)) {
        cachedToken = null;
      }
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 800));
    }
  }

  return { success: false, error: lastErr && (lastErr.message || String(lastErr)) };
}

// ------------------- Non-blocking send helper (root-cause fix)
// Send emails asynchronously so HTTP requests aren't delayed by external Gmail API latency.
function sendEmailRawAsync(emailOptions) {
  // Fire-and-forget but log results (so failures are visible in server logs).
  // We intentionally do not await this in the request handler to keep response fast.
  setImmediate(async () => {
    try {
      const res = await sendEmailRaw(emailOptions);
      if (!res.success) {
        console.warn('Background email failed:', res.error);
      }
    } catch (err) {
      console.error('Background sendEmailRawAsync error:', err && err.message ? err.message : err);
    }
  });
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

// ------------------- POPUP FORM -------------------
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
    const ref = randomUUID().slice(0, 8).toUpperCase();
    const subject = `[Popup] Homepage Inquiry  ${fullName} ${timestampLocal} ${ref}`;

    console.log('Popup subject ->', subject);

    // Prepare admin email (unchanged templates)
    const adminHtml = getAdminPopupEmail({ fullName, email, phone, message, timestamp: timestampLocal, ref });

    // --- ROOT-CAUSE FIX: Send admin email asynchronously (non-blocking) so response is fast ---
    try {
      sendEmailRawAsync({
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject,
        htmlBody: adminHtml,
        textBody: `New popup inquiry from ${fullName} (${email}, ${phone})`
      });
    } catch (bgErr) {
      console.warn('Non-blocking: failed to queue admin email', bgErr && bgErr.message ? bgErr.message : bgErr);
    }

    // Prepare user autoresponse and send async (do not block)
    try {
      const userHtml = getUserPopupEmail({ fullName, ref });
      sendEmailRawAsync({
        to: email,
        subject: `Thanks for your interest in ${COMPANY_NAME}!`,
        htmlBody: userHtml,
        textBody: `Hi ${fullName}, thanks for contacting Soundabode. We'll respond within 24 hours. Ref: ${ref}`
      });
    } catch (bgErr) {
      console.warn('Non-blocking: failed to queue user popup email', bgErr && bgErr.message ? bgErr.message : bgErr);
    }

    // Return success immediately (fast response)
    return res.status(200).json({ success: true, message: 'Popup inquiry received', ref });
  } catch (err) {
    console.error('Popup error:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Failed to process popup form' });
  }
});

// ------------------- CONTACT FORM -------------------
app.post('/api/contact-form', async (req, res) => {
  try {
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
      ? `[Contact] Course Enquiry  ${formattedCourse}  ${fullName}  ${timestampLocal}  ${ref}`
      : `[Contact] General Enquiry  ${fullName}  ${timestampLocal}  ${ref}`;

    console.log('Contact subject ->', subject);

    // Prepare admin email
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

    // --- ROOT-CAUSE FIX: send admin email asynchronously so request is fast ---
    try {
      sendEmailRawAsync({
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject,
        htmlBody: adminHtml,
        textBody: `${enquiryType} from ${fullName} (${email}, ${phone})`
      });
    } catch (bgErr) {
      console.warn('Non-blocking: failed to queue admin email', bgErr && bgErr.message ? bgErr.message : bgErr);
    }

    // Send autoresponse to user asynchronously
    try {
      const userHtml = getUserContactEmail({ fullName, course: formattedCourse, ref, isCourse });
      const userSubject = `${COMPANY_NAME}  We've received your ${enquiryType.toLowerCase()}!`;
      
      sendEmailRawAsync({ 
        to: email, 
        subject: userSubject, 
        htmlBody: userHtml, 
        textBody: `Hi ${fullName}, thanks for contacting Soundabode. We'll reply within 24 hours. Ref: ${ref}` 
      });
    } catch (bgErr) {
      console.warn('Non-blocking: failed to queue user contact email', bgErr && bgErr.message ? bgErr.message : bgErr);
    }

    // Return success immediately (fast response)
    return res.status(200).json({ success: true, message: 'Message received and queued for processing!', ref });
  } catch (err) {
    console.error('Contact error:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Failed to send. Please try again.' });
  }
});

// ------------------- 404 handler -------------------
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

// ------------------- Start server -------------------
app.listen(PORT, async () => {
  console.log('='.repeat(60));
  console.log('✅ Soundabode Backend Server Running');
  console.log(`🌐 Port: ${PORT}`);
  console.log('📧 Email Provider: Gmail API (Direct)');
  console.log(`📱 WhatsApp: ${WHATSAPP_NUMBER}`);
  console.log(`☎️  Phone: ${PHONE_NUMBER}`);
  console.log('🔒 CORS Allowed Origins:', allowedOrigins.join(', '));
  console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
  console.log('='.repeat(60));

  // Pre-warm the Gmail access token to reduce first-request latency
  try {
    await getAccessTokenCached();
    // Schedule periodic refresh every 45 minutes to keep token warm (non-blocking)
    setInterval(() => {
      getAccessTokenCached().catch((e) => console.warn('Periodic token refresh failed', e && e.message ? e.message : e));
    }, 45 * 60 * 1000);
  } catch (e) {
    console.warn('Initial token pre-warm failed (ok if not configured)', e && e.message ? e.message : e);
  }
});
