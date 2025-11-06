// server.js - Soundabode Backend with Gmail API (Direct Send)
import express from 'express';
import { google } from 'googleapis';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE - CORS MUST BE CONFIGURED PROPERLY
// ============================================================================
app.set('trust proxy', 1);

// ✅ PROPER CORS CONFIGURATION
const corsOptions = {
    origin: [
        'https://soundabode.com',
        'https://www.soundabode.com',
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Increased for legitimate traffic
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    console.log('Origin:', req.get('origin'));
    next();
});

// ============================================================================
// GMAIL API CONFIGURATION
// ============================================================================
console.log('\n📧 Configuring Gmail API...');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET');
console.log('EMAIL_CLIENT_ID:', process.env.EMAIL_CLIENT_ID ? '✅ Set' : '❌ NOT SET');
console.log('EMAIL_CLIENT_SECRET:', process.env.EMAIL_CLIENT_SECRET ? '✅ Set' : '❌ NOT SET');
console.log('EMAIL_REFRESH_TOKEN:', process.env.EMAIL_REFRESH_TOKEN ? '✅ Set' : '❌ NOT SET');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || process.env.EMAIL_USER);

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.EMAIL_CLIENT_ID,
    process.env.EMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
    refresh_token: process.env.EMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ============================================================================
// STARTUP VERIFICATION
// ============================================================================
(async () => {
    console.log('🔧 Testing Gmail API configuration...');
    
    try {
        const accessToken = await oauth2Client.getAccessToken();
        
        if (accessToken && accessToken.token) {
            console.log('✅ Gmail API is ready to send emails');
            console.log('   Access token generated successfully\n');
        } else {
            console.warn('⚠️  Could not generate access token\n');
        }
    } catch (error) {
        console.error('❌ Gmail API configuration issue:', error.message);
        console.error('   Emails will fail until credentials are fixed\n');
    }
})();

// ============================================================================
// HELPER FUNCTION - CREATE EMAIL MESSAGE
// ============================================================================
function createEmailMessage(to, subject, htmlBody, textBody) {
    const message = [
        `From: "Soundabode Academy" <${process.env.EMAIL_USER}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        htmlBody
    ].join('\n');

    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return encodedMessage;
}

// ============================================================================
// HELPER FUNCTION - SEND EMAIL VIA GMAIL API
// ============================================================================
async function sendEmailViaGmailAPI(to, subject, htmlBody, textBody, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📤 Attempt ${attempt}/${maxRetries} - Sending to ${to}...`);
            
            const raw = createEmailMessage(to, subject, htmlBody, textBody);
            
            const result = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: raw
                }
            });
            
            console.log(`✅ Email sent: ${result.data.id}`);
            return { success: true, messageId: result.data.id };
        } catch (error) {
            console.error(`❌ Attempt ${attempt} failed:`, error.message);
            if (attempt === maxRetries) {
                return { success: false, error: error.message };
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// ============================================================================
// HELPER FUNCTION - FORMAT COURSE NAME
// ============================================================================
function formatCourseName(courseValue) {
    const courseMap = {
        'dj-training': 'DJ Training',
        'music-production': 'Music Production',
        'audio-engineering': 'Audio Engineering'
    };
    return courseMap[courseValue] || courseValue;
}

// ============================================================================
// ROUTES
// ============================================================================

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Soundabode Backend Server',
        timestamp: new Date().toISOString(),
        emailProvider: 'Gmail API (Direct)',
        endpoints: {
            popupForm: '/api/popup-form',
            contactForm: '/api/contact-form',
            health: '/health'
        },
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_CLIENT_ID && 
                      process.env.EMAIL_CLIENT_SECRET && process.env.EMAIL_REFRESH_TOKEN)
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// ============================================================================
// POPUP FORM - Homepage (index.html)
// ============================================================================
app.post('/api/popup-form', limiter, async (req, res) => {
    try {
        console.log('📩 Popup form received:', req.body);

        const { name, email, phone, message } = req.body;

        if (!name || !email || !phone) {
            console.log('❌ Validation failed');
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone are required'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        console.log('✅ Validation passed');
        console.log('📧 Sending emails via Gmail API...');

        // Admin notification HTML
        const adminHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🔥 New Popup Inquiry (Homepage)</h1>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #333;">Contact Details</h2>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="padding: 12px; background: #f5f5f5; font-weight: bold; width: 120px;">Name:</td>
                            <td style="padding: 12px;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; background: #f5f5f5; font-weight: bold;">Email:</td>
                            <td style="padding: 12px;"><a href="mailto:${email}" style="color: #667eea;">${email}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 12px; background: #f5f5f5; font-weight: bold;">Phone:</td>
                            <td style="padding: 12px;"><a href="tel:${phone}" style="color: #667eea;">${phone}</a></td>
                        </tr>
                    </table>
                    
                    ${message ? `
                    <div style="margin-top: 25px; padding: 15px; background: #f9f9f9; border-left: 4px solid #667eea; border-radius: 5px;">
                        <h3 style="margin: 0 0 10px 0; color: #333;">Message:</h3>
                        <p style="margin: 0; line-height: 1.6; color: #555;">${message}</p>
                    </div>
                    ` : ''}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
                        <p style="margin: 0;">Submitted on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        <p style="margin: 5px 0 0 0;">Source: Homepage Popup Form</p>
                    </div>
                </div>
            </div>
        `;

        // User auto-response HTML
        const userHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Soundabode! 🎵</h1>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #333; margin-top: 0;">Hi ${name}! 👋</h2>
                    
                    <p style="line-height: 1.8; color: #555; font-size: 16px;">
                        Thank you for reaching out to <strong>Soundabode</strong> — India's leading academy for Music Production and DJ Training!
                    </p>
                    
                    <p style="line-height: 1.8; color: #555; font-size: 16px;">
                        We've received your inquiry and our team will get back to you within <strong>24 hours</strong>.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; margin: 25px 0; text-align: center;">
                        <p style="color: white; margin: 0; font-size: 18px; font-weight: bold;">
                            🎧 Ready to Start Your Musical Journey? 🎹
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <p style="color: #555; margin-bottom: 15px; font-size: 16px;">Have immediate questions?</p>
                        <a href="tel:+919975016189" style="display: inline-block; background: #25D366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px;">
                            📞 Call: +91 997 501 6189
                        </a>
                        <a href="https://wa.me/919975016189" style="display: inline-block; background: #25D366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px;">
                            💬 WhatsApp Us
                        </a>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                        <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0;">
                            <strong>Soundabode Academy</strong><br>
                            Vision 9, 2nd Floor, Pimple Saudagar, Pune 411017<br>
                            <a href="mailto:services@soundabode.com" style="color: #667eea;">services@soundabode.com</a>
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Send emails
        const adminResult = await sendEmailViaGmailAPI(
            process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            ` Homepage Quick Inquiry - ${name}`,
            adminHtml,
            `New Popup Inquiry from Homepage\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}${message ? `\nMessage: ${message}` : ''}`
        );

        if (!adminResult.success) {
            throw new Error(`Admin email failed: ${adminResult.error}`);
        }

        const userResult = await sendEmailViaGmailAPI(
            email,
            'Thank you for contacting Soundabode! ',
            userHtml,
            `Hi ${name}!\n\nThank you for reaching out to Soundabode Academy.`
        );

        if (!userResult.success) {
            console.warn('⚠️  User email failed, but admin was notified');
        }

        console.log('✅ Popup form processed successfully');

        res.status(200).json({
            success: true,
            message: 'Thank you! We\'ll contact you within 24 hours.'
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to submit. Please try again or call +91 997 501 6189'
        });
    }
});

// ============================================================================
// CONTACT FORM - General & Course Enquiries (contact.html)
// ============================================================================
app.post('/api/contact-form', limiter, async (req, res) => {
    try {
        console.log(' Contact form received:', req.body);

        const { fullName, email, phone, course, message } = req.body;

        if (!fullName || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Required fields missing'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        console.log('✅ Validation passed');

        const isCourseEnquiry = course && course.trim() !== '';
        const enquiryType = isCourseEnquiry ? 'Course Enquiry' : 'General Enquiry';
        const formattedCourse = isCourseEnquiry ? formatCourseName(course) : 'N/A';

        console.log(`📝 Enquiry Type: ${enquiryType}`);
        if (isCourseEnquiry) {
            console.log(`📚 Course: ${formattedCourse}`);
        }

        // Admin HTML
        const adminHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, ${isCourseEnquiry ? '#4CAF50' : '#667eea'} 0%, ${isCourseEnquiry ? '#45a049' : '#764ba2'} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">${isCourseEnquiry ? '🎓' : '📧'} New ${enquiryType}</h1>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #333;">Contact Details</h2>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr><td style="padding: 12px; background: #f5f5f5; font-weight: bold; width: 140px;">Name:</td><td style="padding: 12px;">${fullName}</td></tr>
                        <tr><td style="padding: 12px; background: #f5f5f5; font-weight: bold;">Email:</td><td style="padding: 12px;"><a href="mailto:${email}">${email}</a></td></tr>
                        <tr><td style="padding: 12px; background: #f5f5f5; font-weight: bold;">Phone:</td><td style="padding: 12px;"><a href="tel:${phone}">${phone}</a></td></tr>
                        ${isCourseEnquiry ? `<tr><td style="padding: 12px; background: #f5f5f5; font-weight: bold;">Course:</td><td style="padding: 12px;"><span style="background: #4CAF50; color: white; padding: 5px 15px; border-radius: 20px;">${formattedCourse}</span></td></tr>` : ''}
                    </table>
                    
                    ${message ? `<div style="margin-top: 25px; padding: 20px; background: #f9f9f9; border-left: 4px solid ${isCourseEnquiry ? '#4CAF50' : '#667eea'}; border-radius: 5px;"><h3 style="margin: 0 0 10px 0; color: #333;">Message:</h3><p style="margin: 0; line-height: 1.6; color: #555;">${message}</p></div>` : ''}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px;">
                        <p style="margin: 0;">Submitted on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        <p style="margin: 5px 0 0 0;">Source: Contact Page Form</p>
                    </div>
                </div>
            </div>
        `;

        const adminResult = await sendEmailViaGmailAPI(
            process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            `${isCourseEnquiry ? '🎓' : '📧'} ${enquiryType} - ${fullName}`,
            adminHtml,
            `New ${enquiryType}\n\nName: ${fullName}\nEmail: ${email}\nPhone: ${phone}${isCourseEnquiry ? `\nCourse: ${formattedCourse}` : ''}${message ? `\nMessage: ${message}` : ''}`
        );

        if (!adminResult.success) {
            throw new Error(`Failed to send email: ${adminResult.error}`);
        }

        await sendEmailViaGmailAPI(
            email,
            `Thank you for contacting Soundabode!${isCourseEnquiry ? ` (${formattedCourse})` : ''}`,
            `<h2>Hi ${fullName}!</h2><p>Thank you for your ${enquiryType.toLowerCase()}. We'll respond within 24 hours.</p>`,
            `Hi ${fullName}!\n\nThank you for contacting Soundabode Academy.`
        );

        res.status(200).json({ success: true, message: 'Message sent successfully!' });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send. Please try again.'
        });
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
    console.log('🔒 CORS Enabled for: soundabode.com');
    console.log('⏰ Started:', new Date().toLocaleString('en-IN'));
    console.log('='.repeat(60) + '\n');
});
