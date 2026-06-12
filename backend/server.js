require('dotenv').config(); // Carica le variabili dal file .env
const express = require('express');
const cors = require('cors');

const transactionsRoutes = require('./routes/transactions.routes');
const aiRoutes = require('./routes/ai.routes'); // Rotta per l'Intelligenza Artificiale

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

// ROUTES
app.use('/api/transactions', transactionsRoutes);
app.use('/api/ai', aiRoutes); // Esposizione dell'endpoint IA

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});