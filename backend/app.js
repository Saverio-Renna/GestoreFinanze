require('dotenv').config();
const express = require('express');
const cors = require('cors');

const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes'); // NUOVO
const transactionsRoutes = require('./routes/transactions.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(logger);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes); // NUOVO
app.use('/api/transactions', transactionsRoutes);
app.use('/api/ai', aiRoutes);

app.use(errorHandler);

module.exports = app;