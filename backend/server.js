const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
const projectRoutes = require('./routes/projectRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Static files (for frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback to index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

console.log('Using JSON storage for projects');

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('NODE_ENV check:', process.env.NODE_ENV);
if (process.env.NODE_ENV !== 'production') {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 NextGen IdeaEngine Backend running at http://localhost:${PORT}`);
        console.log(`API Base: http://localhost:${PORT}/api`);
    });
    server.on('error', (e) => {
        console.error('SERVER ERROR:', e);
    });
} else {
    console.log('Server in Production mode, not listening locally.');
}

// Export for Vercel
module.exports = app;
