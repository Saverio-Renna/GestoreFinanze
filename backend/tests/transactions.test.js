// ─── transactions.test.js ─────────────────────────────────────────────────────
// Test di INTEGRAZIONE delle route HTTP: verifica che controller e route
// rispondano correttamente, mockando il service per evitare il DB.

const request = require('supertest');

// 1. Mockiamo il middleware di autenticazione per simulare un utente loggato
jest.mock('../middleware/auth.middleware', () => (req, res, next) => {
  req.user = { id: 1, username: 'testuser' };
  next();
});

// 2. Mockiamo Redis per evitare connessioni di rete appese (Open Handles)
jest.mock('../config/redis', () => ({
  connect: jest.fn().mockResolvedValue(),
  on: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue('OK'),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(1)
}));

jest.mock('../services/transactions.service');
const service = require('../services/transactions.service');

jest.mock('../middleware/logger', () => (req, res, next) => next());

const app = require('../app');

// ─── Dati fittizi ─────────────────────────────────────────────────────────────
const transazioneFake = {
  id: 1,
  description: 'Stipendio luglio',
  amount: '1500.00',
  type: 'entrata',
  category: 'Stipendio',
  created_at: '2024-07-01T10:00:00.000Z'
};

const rispostaGetAll = {
  transactions: [transazioneFake],
  allFilteredTransactions: [transazioneFake],
  totalPages: 1,
  currentPage: 1
};

// ─── GET /api/transactions ────────────────────────────────────────────────────
describe('GET /api/transactions', () => {

  test('restituisce lista transazioni con status 200', async () => {
    service.getAllTransactions.mockResolvedValue(rispostaGetAll);

    const res = await request(app).get('/api/transactions');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('transactions');
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].description).toBe('Stipendio luglio');
  });

  test('supporta filtro per categoria', async () => {
    service.getAllTransactions.mockResolvedValue(rispostaGetAll);

    const res = await request(app).get('/api/transactions?category=Stipendio');

    expect(res.status).toBe(200);
    expect(service.getAllTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Stipendio' })
    );
  });

  // ✅ NUOVO: filtri vuoti non devono rompere nulla
  test('funziona correttamente con filtri tutti vuoti', async () => {
    service.getAllTransactions.mockResolvedValue({
      transactions: [],
      allFilteredTransactions: [],
      totalPages: 1,
      currentPage: 1
    });

    const res = await request(app)
      .get('/api/transactions?search=&category=Tutte&month=');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('transactions');
    expect(service.getAllTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ search: '', category: 'Tutte', month: '' })
    );
  });

  test('restituisce 500 se il service lancia un errore', async () => {
    service.getAllTransactions.mockRejectedValue(new Error('DB non raggiungibile'));

    const res = await request(app).get('/api/transactions');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

});

// ─── POST /api/transactions ───────────────────────────────────────────────────
describe('POST /api/transactions', () => {

  test('crea una nuova transazione e restituisce 201', async () => {
    service.createTransaction.mockResolvedValue({ insertId: 2 });

    const res = await request(app)
      .post('/api/transactions')
      .send({ description: 'Spesa supermercato', amount: 45.50, type: 'uscita', category: 'Cibo' });

    expect(res.status).toBe(201);
  });

  // ✅ NUOVO: body completamente vuoto
  test('restituisce 500 se il service lancia un errore (body vuoto)', async () => {
    service.createTransaction.mockRejectedValue(new Error('Errore INSERT'));

    const res = await request(app)
      .post('/api/transactions')
      .send({});

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  test('restituisce 500 se il service lancia un errore', async () => {
    service.createTransaction.mockRejectedValue(new Error('Errore INSERT'));

    const res = await request(app)
      .post('/api/transactions')
      .send({ description: 'Test errore', amount: 10, type: 'uscita', category: 'Altro' });

    expect(res.status).toBe(500);
  });

});

// ─── PUT /api/transactions/:id ────────────────────────────────────────────────
describe('PUT /api/transactions/:id', () => {

  test('aggiorna una transazione esistente e restituisce 200', async () => {
    service.updateTransaction.mockResolvedValue({ affectedRows: 1 });

    const res = await request(app)
      .put('/api/transactions/1')
      .send({ description: 'Stipendio aggiornato', amount: 1600, type: 'entrata', category: 'Stipendio' });

    expect(res.status).toBe(200);
  });

  // ✅ NUOVO: test del caso di errore — mancava completamente
  test('restituisce 500 se il service lancia un errore', async () => {
    service.updateTransaction.mockRejectedValue(new Error('Errore UPDATE'));

    const res = await request(app)
      .put('/api/transactions/99')
      .send({ description: 'X', amount: 1, type: 'uscita', category: 'Altro' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

});

// ─── DELETE /api/transactions/:id ────────────────────────────────────────────
describe('DELETE /api/transactions/:id', () => {

  test('elimina una transazione e restituisce 200', async () => {
    service.deleteTransaction.mockResolvedValue({ affectedRows: 1 });

    const res = await request(app).delete('/api/transactions/1');

    expect(res.status).toBe(200);
  });

  test('restituisce 500 se il service lancia un errore', async () => {
    service.deleteTransaction.mockRejectedValue(new Error('Errore DELETE'));

    const res = await request(app).delete('/api/transactions/999');

    expect(res.status).toBe(500);
  });

});