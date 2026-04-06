// server.js - Soundabode Backend with Enhanced Email Templates, Token Management & Real-Time Blog
// Usage: set EMAIL_USER, EMAIL_CLIENT_ID, EMAIL_CLIENT_SECRET, EMAIL_REFRESH_TOKEN, ADMIN_EMAIL, CORS_ORIGINS

import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { Server as SocketServer } from 'socket.io';
import http from 'http';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const BLOGS_FILE = path.join(DATA_DIR, 'blogs.json');

// ------------------- Configuration -------------------
const PHONE_NUMBER = '+919975016189';
const WHATSAPP_NUMBER = '919975016189';
const COMPANY_NAME = 'Soundabode Academy';
const COMPANY_ADDRESS = 'Shop No. 218, Vision 9 Mall, Pimple Saudagar, Pune 411027';
const WEBSITE_URL = 'https://soundabode.com';
const LOGO_URL = 'https://res.cloudinary.com/di5bqvkma/image/upload/v1761233576/sa-logo_edited_vycsd0.png';

// ------------------- Basic security & parsers -------------------
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.socket.io"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
            "connect-src": ["'self'", "ws:", "wss:", "http://localhost:3000", "https://soundabode.com"]
        }
    }
}));
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
    // Unconditionally allow all origins for the public API and testing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    // Note: Access-Control-Allow-Credentials cannot be 'true' when Allow-Origin is '*'
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// ------------------- Logging middleware -------------------
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.ip} ${req.method} ${req.originalUrl} Origin:${req.get('origin') || 'none'}`);
    next();
});

// ------------------- Static files -------------------
// Serve from the parent directory (project root)
app.use(express.static(path.join(__dirname, '..')));

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
let refreshInterval = null;

async function getAccessTokenCached() {
    const now = Date.now();

    // Return cached token if still valid (with 5-minute buffer)
    if (
        cachedToken &&
        cachedToken.token &&
        cachedToken.expiry &&
        cachedToken.expiry - now > 5 * 60 * 1000
    ) {
        return cachedToken.token;
    }

    try {
        // Force a fresh token by resetting credentials with the refresh token
        oauth2Client.setCredentials({ refresh_token: process.env.EMAIL_REFRESH_TOKEN });
        const tokenResponse = await oauth2Client.getAccessToken();

        const token =
            tokenResponse?.token ||
            tokenResponse?.res?.data?.access_token ||
            null;

        if (!token) {
            throw new Error('Failed to obtain access token - token was null/undefined');
        }

        const creds = oauth2Client.credentials || {};
        const expiry = creds.expiry_date
            ? Number(creds.expiry_date)
            : Date.now() + 55 * 60 * 1000;

        cachedToken = { token, expiry };

        const expiresInMinutes = Math.round((expiry - now) / 60000);
        console.log(`🔑 Gmail access token refreshed — expires in ${expiresInMinutes}m`);
        console.log(`   Next auto-refresh: ${new Date(expiry - 10 * 60 * 1000).toLocaleString('en-IN')}`);

        return token;
    } catch (err) {
        console.error('❌ getAccessTokenCached error:', err.message || err);

        if (err.message && err.message.includes('invalid_grant')) {
            console.error('⚠️  CRITICAL: Refresh token is invalid or revoked!');
            console.error('   Regenerate OAuth2 credentials at: https://developers.google.com/oauthplayground');
        }

        cachedToken = null;
        throw err;
    }
}

function startTokenRefreshScheduler() {
    if (refreshInterval) clearInterval(refreshInterval);

    refreshInterval = setInterval(async () => {
        try {
            console.log('⏰ Scheduled token refresh triggered...');
            cachedToken = null; // Force refresh
            await getAccessTokenCached();
        } catch (err) {
            console.error('⚠️  Scheduled token refresh failed:', err.message || err);
        }
    }, 50 * 60 * 1000); // every 50 minutes

    console.log('✅ Token refresh scheduler started (every 50 minutes)');
}

// ------------------- Email Template Helpers -------------------

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
        <table role="presentation" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">

          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 24px;text-align:center;">
              <img src="${LOGO_URL}" alt="${COMPANY_NAME}" style="height:50px;width:auto;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">${title}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;">
              ${content}
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 32px;">
              <table role="presentation" style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding-right:8px;width:50%;">
                    <a href="https://wa.me/${WHATSAPP_NUMBER}" style="display:block;background-color:#25D366;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;text-align:center;font-weight:600;font-size:14px;">
                      📱 WhatsApp
                    </a>
                  </td>
                  <td style="padding-left:8px;width:50%;">
                    <a href="tel:${PHONE_NUMBER}" style="display:block;background-color:#667eea;color:#ffffff;text-decoration:none;padding:14px 20px;border-radius:8px;text-align:center;font-weight:600;font-size:14px;">
                      📞 Call Us
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

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
  `.trim();
}

function getAdminPopupEmail({ fullName, email, phone, message, timestamp, ref }) {
    const content = `
    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.1) 0%,rgba(118,75,162,0.1) 100%);border-left:4px solid #667eea;padding:20px;border-radius:8px;margin-bottom:24px;">
      <h2 style="margin:0 0 8px;color:#667eea;font-size:18px;">🔥 New Homepage Popup Inquiry</h2>
      <p style="margin:0;color:#6c757d;font-size:14px;">Someone is interested in your courses!</p>
    </div>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;width:40%;">
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

    return getBaseEmailTemplate({
        title: '🎉 New Popup Inquiry',
        content,
        footerNote: `Submitted: ${timestamp} | Source: Homepage Popup | Ref: ${ref}`
    });
}

function getAdminContactEmail({ fullName, email, phone, course, message, timestamp, ref, isCourse }) {
    const courseDisplay = course || 'N/A';
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
        <td style="padding:12px 0;border-bottom:1px solid #e9ecef;width:40%;">
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

    return getBaseEmailTemplate({
        title: `${enquiryIcon} New ${enquiryType}`,
        content,
        footerNote: `Submitted: ${timestamp} | Source: Contact Page | Ref: ${ref}`
    });
}

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

function getUserContactEmail({ fullName, course, ref, isCourse }) {
    const courseText = isCourse
        ? `about our <strong>${course}</strong> course`
        : 'your inquiry';

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
    const body = htmlBody || textBody || '';

    const parts = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        `Message-ID: ${msgId}`,
        `Date: ${dateHeader}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(body, 'utf-8').toString('base64')
    ];

    return Buffer.from(parts.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// ------------------- Email sending (with full logging) -------------------
async function sendEmailRaw({ to, subject, htmlBody, textBody, maxRetries = 3 }) {
    if (!process.env.EMAIL_USER) {
        throw new Error('EMAIL_USER not configured');
    }

    let lastErr = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const token = await getAccessTokenCached();

            oauth2Client.setCredentials({
                access_token: token,
                refresh_token: process.env.EMAIL_REFRESH_TOKEN
            });

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

            const duration = Date.now() - t0;
            console.log(`✅ Email sent to "${to}" | subject: "${subject}" | attempt ${attempt}/${maxRetries} | ${duration}ms | msgId: ${res.data?.id}`);

            return { success: true, id: res.data?.id };

        } catch (err) {
            lastErr = err;
            const errMsg = err?.response?.data
                ? JSON.stringify(err.response.data)
                : err.message || String(err);

            console.error(`❌ Email attempt ${attempt}/${maxRetries} to "${to}" FAILED: ${errMsg}`);

            if (err.code === 401 || err.code === 403 || (err.status && (err.status === 401 || err.status === 403))) {
                console.warn('   Auth error — clearing token cache for next retry');
                cachedToken = null;
            }

            if (attempt < maxRetries) {
                const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
                console.log(`   Retrying in ${waitMs}ms...`);
                await new Promise(r => setTimeout(r, waitMs));
            }
        }
    }

    console.error(`❌❌ Email to "${to}" PERMANENTLY FAILED after ${maxRetries} attempts. Last error: ${lastErr?.message || lastErr}`);
    return {
        success: false,
        error: lastErr?.message || String(lastErr)
    };
}

// Fire-and-forget but WITH full logging
function sendEmailAsync(emailOptions) {
    setImmediate(async () => {
        try {
            console.log(`📤 [ASYNC] Sending email to: ${emailOptions.to} | Subject: ${emailOptions.subject}`);
            const result = await sendEmailRaw(emailOptions);
            if (result.success) {
                console.log(`✅ [ASYNC] Email delivered to: ${emailOptions.to}`);
            } else {
                console.error(`❌ [ASYNC] Email FAILED to: ${emailOptions.to} | Reason: ${result.error}`);
            }
        } catch (err) {
            console.error(`❌ [ASYNC] Unexpected error sending to ${emailOptions.to}:`, err?.message || err);
        }
    });
}

// ------------------- Blog API -------------------

async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(BLOGS_FILE);
        } catch {
            await fs.writeFile(BLOGS_FILE, '[]', 'utf8');
        }
    } catch (err) {
        console.error('Error ensuring data directory:', err);
    }
}

async function getBlogs() {
    await ensureDataDir();
    try {
        const data = await fs.readFile(BLOGS_FILE, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        return [];
    }
}

async function saveBlogs(blogs) {
    await fs.writeFile(BLOGS_FILE, JSON.stringify(blogs, null, 2), 'utf8');
}

app.get('/api/blogs', async (req, res) => {
    const blogs = await getBlogs();
    res.json(blogs);
});

app.post('/api/blogs', async (req, res) => {
    const { id, heading, subheading, date, content, password } = req.body;
    
    // Simple admin check
    if (password !== 'admin') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const blogs = await getBlogs();
    const newBlog = {
        id: id || Date.now().toString(),
        heading,
        subheading,
        date: date || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        content,
        imageUrl: req.body.imageUrl || '',
        category: req.body.category || 'General',
        author: req.body.author || 'Soundabode'
    };

    if (id) {
        const index = blogs.findIndex(b => b.id === id);
        if (index > -1) blogs[index] = newBlog;
        else blogs.unshift(newBlog);
    } else {
        blogs.unshift(newBlog);
    }

    await saveBlogs(blogs);
    io.emit('blogUpdate', newBlog);
    res.status(201).json({ success: true, blog: newBlog });
});

app.delete('/api/blogs/:id', async (req, res) => {
    const { password } = req.body;
    
    // Simple admin check
    if (password !== 'admin') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    let blogs = await getBlogs();
    
    const initialLength = blogs.length;
    blogs = blogs.filter(b => b.id !== id);
    
    if (blogs.length === initialLength) {
        return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    await saveBlogs(blogs);
    // Tell clients to refresh the blog list
    io.emit('blogDeleted', id);
    
    res.json({ success: true, message: 'Blog deleted successfully' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Plug Socket connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`Plug Socket disconnected: ${socket.id}`));
});

// ------------------- Routes -------------------
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'Soundabode Backend',
        timestamp: new Date().toISOString(),
        endpoints: {
            popupForm: '/api/popup-form',
            contactForm: '/api/contact-form',
            health: '/health',
            testEmail: '/api/test-email'
        },
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_CLIENT_ID && process.env.EMAIL_REFRESH_TOKEN)
    });
});

app.get('/health', (req, res) =>
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        tokenCached: !!cachedToken,
        tokenExpiry: cachedToken ? new Date(cachedToken.expiry).toISOString() : null
    })
);

// ---- TEST EMAIL ENDPOINT ----
app.get('/api/test-email', async (req, res) => {
    console.log('🧪 Test email endpoint hit');
    const result = await sendEmailRaw({
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: `Soundabode Backend — Test Email ${new Date().toLocaleString('en-IN')}`,
        htmlBody: `<h2>✅ Test Email</h2><p>Gmail integration is working correctly. Server time: ${new Date().toISOString()}</p>`,
        maxRetries: 2
    });

    if (result.success) {
        return res.json({ success: true, message: 'Test email sent successfully!', id: result.id });
    } else {
        return res.status(500).json({ success: false, message: 'Test email failed', error: result.error });
    }
});

// ---- POPUP FORM ----
app.post('/api/popup-form', async (req, res) => {
    try {
        console.log('📩 /api/popup-form received | body:', JSON.stringify(req.body));

        const fullName = pickName(req.body);
        const email = req.body?.email ? String(req.body.email).trim() : '';
        const phone = req.body?.phone ? String(req.body.phone).trim() : '';
        const message = req.body?.message ? String(req.body.message).trim() : '';

        if (!fullName || fullName === 'Unknown' || !email || !phone) {
            console.warn('❌ Popup validation failed — missing fields', { fullName, email, phone });
            return res.status(400).json({ success: false, message: 'Name, email and phone are required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }

        const timestampLocal = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const ref = randomUUID().slice(0, 8).toUpperCase();
        const subject = `[Popup] Homepage Inquiry — ${fullName} — ${ref}`;

        console.log(`📬 Popup inquiry | ref: ${ref} | name: ${fullName} | email: ${email} | phone: ${phone}`);

        // Admin email
        sendEmailAsync({
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject,
            htmlBody: getAdminPopupEmail({ fullName, email, phone, message, timestamp: timestampLocal, ref })
        });

        // User confirmation email
        sendEmailAsync({
            to: email,
            subject: `Thanks for your interest in ${COMPANY_NAME}!`,
            htmlBody: getUserPopupEmail({ fullName, ref })
        });

        return res.status(200).json({ success: true, message: 'Inquiry received successfully!', ref });

    } catch (err) {
        console.error('❌ /api/popup-form error:', err?.message || err);
        return res.status(500).json({ success: false, message: 'Failed to process popup form. Please try again.' });
    }
});

// ---- CONTACT FORM ----
app.post('/api/contact-form', async (req, res) => {
    try {
        console.log('📩 /api/contact-form received | body:', JSON.stringify(req.body));

        const fullName = pickName(req.body);
        const email = req.body?.email ? String(req.body.email).trim() : '';
        const phone = req.body?.phone ? String(req.body.phone).trim() : '';
        const course = req.body?.course ? String(req.body.course).trim() : '';
        const message = req.body?.message ? String(req.body.message).trim() : '';

        if (!fullName || fullName === 'Unknown' || !email || !phone) {
            console.warn('❌ Contact validation failed — missing fields', { fullName, email, phone });
            return res.status(400).json({ success: false, message: 'Name, email and phone are required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }

        const isCourse = Boolean(course && course !== '');
        const formattedCourse = isCourse ? formatCourseName(course) : 'N/A';
        const enquiryType = isCourse ? 'Course Enquiry' : 'General Enquiry';

        const timestampLocal = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const ref = randomUUID().slice(0, 8).toUpperCase();

        const subject = isCourse
            ? `[Contact] Course Enquiry — ${formattedCourse} — ${fullName} — ${ref}`
            : `[Contact] General Enquiry — ${fullName} — ${ref}`;

        console.log(`📬 Contact form | ref: ${ref} | type: ${enquiryType} | name: ${fullName} | email: ${email} | course: ${formattedCourse}`);

        // Admin email
        sendEmailAsync({
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject,
            htmlBody: getAdminContactEmail({
                fullName, email, phone,
                course: formattedCourse,
                message, timestamp: timestampLocal,
                ref, isCourse
            })
        });

        // User confirmation email
        sendEmailAsync({
            to: email,
            subject: `${COMPANY_NAME} — We've received your ${enquiryType.toLowerCase()}!`,
            htmlBody: getUserContactEmail({ fullName, course: formattedCourse, ref, isCourse })
        });

        return res.status(200).json({ success: true, message: 'Message received successfully!', ref });

    } catch (err) {
        console.error('❌ /api/contact-form error:', err?.message || err);
        return res.status(500).json({ success: false, message: 'Failed to send. Please try again.' });
    }
});

// ---- Clean URL / Static HTML fallback ----
app.get('*', async (req, res, next) => {
    // Skip if it's an API call or has a file extension
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
    if (path.extname(req.path)) return next();

    // Standardize path: remove trailing slash for consistent resolution
    const normalizedPath = req.path.replace(/\/+$/, '') || '/index';

    // Redirect if request has .html extension
    if (req.path.endsWith('.html')) {
        const cleanPath = req.path.slice(0, -5);
        console.log(`[Clean URL] Redirecting: ${req.path} -> ${cleanPath}`);
        return res.redirect(301, cleanPath);
    }

    // 0. Special case for the courses landing page to avoid file/folder conflict
    if (normalizedPath === '/courses') {
        const landingPath = path.join(__dirname, '..', 'courses-landing.html');
        try {
            await fs.access(landingPath);
            console.log(`[Clean URL] Request: /courses -> Special Mapping: courses-landing.html`);
            return res.sendFile(landingPath);
        } catch (e) {}
    }

    // 1. Try exact path + .html (e.g. /about -> about.html)
    // 2. Then try [path]/index.html (rare but useful for folders)
    const candidates = [
        path.join(__dirname, '..', normalizedPath + '.html'),
        path.join(__dirname, '..', normalizedPath, 'index.html')
    ];

    for (const filePath of candidates) {
        try {
            await fs.access(filePath);
            const fileName = path.basename(filePath);
            console.log(`[Clean URL] Request: ${req.path} -> Serving: ${fileName}`);
            return res.sendFile(filePath);
        } catch (e) {
            // Check next candidate
        }
    }

    // Defensive: log if we are inside /courses/ but no file was found
    if (req.path.startsWith('/courses/')) {
        console.warn(`[Routing Warning] Course sub-path requested but no matching file found: ${req.path}`);
    }

    // Default to index.html for SPA-like behavior on root or non-matching routes
    return next();
});

app.use((req, res) =>
    res.status(404).json({ success: false, message: 'Endpoint not found' })
);

// ------------------- Start Server -------------------
server.listen(PORT, async () => {
    console.log('='.repeat(60));
    console.log('✅ Soundabode Backend Server Running');
    console.log(`🌐 Port: ${PORT}`);
    console.log('📧 Email Provider: Gmail API (OAuth2 with auto-refresh)');
    console.log(`📱 WhatsApp: ${WHATSAPP_NUMBER}`);
    console.log(`☎️  Phone: ${PHONE_NUMBER}`);
    console.log('🔒 CORS Allowed Origins:', allowedOrigins.join(', '));
    console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
    console.log('='.repeat(60));

    // --- Pre-warm Gmail access token ---
    try {
        console.log('🔄 Pre-warming Gmail access token...');
        await getAccessTokenCached();
        startTokenRefreshScheduler();
        console.log('✅ Gmail authentication ready — token will auto-refresh every 50 minutes');
    } catch (e) {
        console.error('❌ Failed to initialize Gmail authentication:', e.message || e);
        console.error('   Server is running but email features will NOT work.');
        console.error('   Please verify OAuth2 credentials in your .env file.');
    }
});
