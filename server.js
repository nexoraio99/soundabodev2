// server.js - Consolidated Soundabode Server with Clean URLs, API, and Real-Time Blog
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
import cors from 'cors';

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
const DATA_DIR = path.join(__dirname, 'data');
const BLOGS_FILE = path.join(DATA_DIR, 'blogs.json');

// ------------------- Configuration -------------------
const COMPANY_NAME = 'Soundabode Academy';
const COMPANY_ADDRESS = 'Shop No. 218, Vision 9 Mall, Pimple Saudagar, Pune 411027';
const WEBSITE_URL = 'https://soundabode.com';
const LOGO_URL = 'https://res.cloudinary.com/di5bqvkma/image/upload/v1761233576/sa-logo_edited_vycsd0.png';
const WHATSAPP_NUMBER = '919975016189';
const PHONE_NUMBER = '+919975016189';

// ------------------- Basic security & parsers -------------------
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false, // For easier local development with external assets
}));
app.use(cors());
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

// ------------------- Logging middleware -------------------
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// ------------------- Blog API Logic -------------------
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
    const { id, heading, subheading, date, content, imageUrl, category, author, password } = req.body;

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
        imageUrl: imageUrl || '',
        category: category || 'General',
        author: author || 'Soundabode'
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

// ------------------- Static files & Clean URLs -------------------

// 1. Serve static assets first (images, css, js)
app.use(express.static(__dirname));

// 2. Clean URL support: Try adding .html
app.get('*', async (req, res, next) => {
    // Skip if it's an API call or has a file extension
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) return next();
    if (path.extname(req.path)) return next();

    // Standardize path: remove trailing slash for consistent resolution
    const normalizedPath = req.path.replace(/\/+$/, '') || '/index';

    // 1. Try exact path + .html (e.g. /about -> about.html)
    // 2. Then try [path]/index.html (rare but useful for folders)
    const candidates = [
        path.join(__dirname, normalizedPath + '.html'),
        path.join(__dirname, normalizedPath, 'index.html')
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
    // But only if it's not a courses sub-path (to avoid the courses.html override)
    return next();
});

// ------------------- Socket.io -------------------
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`Socket disconnected: ${socket.id}`));
});

// ------------------- Start Server -------------------
server.listen(PORT, async () => {
    console.log('='.repeat(60));
    console.log('✅ Soundabode Consolidated Server Running');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`⏰ Started: ${new Date().toLocaleString('en-IN')}`);
    console.log('='.repeat(60));

    await ensureDataDir();
});
