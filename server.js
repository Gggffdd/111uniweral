require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// CryptoBot API
const cryptoBot = axios.create({
    baseURL: process.env.CRYPTO_BOT_API_URL,
    headers: {
        'Crypto-Pay-API-Token': process.env.CRYPTO_BOT_API_KEY
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    if (req.session.userId == process.env.ADMIN_ID) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.redirect('/login');
    }
});

app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'editor.html'));
});

app.post('/api/create-invoice', async (req, res) => {
    try {
        const { amount, currency = 'USD', description } = req.body;
        
        const response = await cryptoBot.post('/createInvoice', {
            amount,
            currency,
            description,
            paid_btn_name: 'callback',
            paid_btn_url: `${process.env.URL}/success`
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Invoice error:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// File upload
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (req.file) {
            // Process image with sharp if needed
            const processedPath = `uploads/processed_${req.file.filename}`;
            await sharp(req.file.path)
                .resize(800, 600, { fit: 'inside' })
                .toFile(processedPath);
            
            res.json({ 
                success: true, 
                original: `/uploads/${req.file.filename}`,
                processed: `/uploads/processed_${req.file.filename}`
            });
        } else {
            res.status(400).json({ error: 'No file uploaded' });
        }
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Telegram bot commands
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `👋 Добро пожаловать в UNIVERSAL SHOP!\n\n` +
                          `Здесь вы можете создать свой магазин и обменник USDT/TON.\n` +
                          `Используйте /editor для доступа к редактору.\n` +
                          `/admin для панели администратора.`;
    
    bot.sendMessage(chatId, welcomeMessage);
});

bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId == process.env.ADMIN_ID) {
        bot.sendMessage(chatId, 'Админ-панель: ' + process.env.URL + '/admin');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
});
