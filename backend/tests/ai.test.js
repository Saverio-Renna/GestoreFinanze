// ─── ai.test.js ───────────────────────────────────────────────────────────────
// Test di INTEGRAZIONE degli endpoint AI: mockiamo Gemini e il service
// così i test girano offline senza consumare crediti API né richiedere il DB.

const request = require('supertest');

// 1. Mockiamo il middleware di autenticazione
jest.mock('../middleware/auth.middleware', () => (req, res, next) => {
  req.user = { id: 1, username: 'testuser' };
  next();
});

// 2. Mockiamo Redis (usato per la cache dei consigli AI)
jest.mock('../config/redis', () => ({
  connect: jest.fn().mockResolvedValue(),
  on: jest.fn(),
  get: jest.fn().mockResolvedValue(null), // Simula che la cache sia vuota
  setEx: jest.fn().mockResolvedValue('OK')
}));

// ⚠️  Le variabili usate dentro jest.mock() DEVONO iniziare con "mock"
//    Jest solleva i mock prima dell'esecuzione del file, quindi variabili
//    normali non sarebbero ancora inizializzate.
let mockGeminiRisposta = 'Cibo';

jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockImplementation(() =>
          Promise.resolve({ response: { text: () => mockGeminiRisposta } })
        )
      })
    }))
  };
});

jest.mock('../services/transactions.service');
const service = require('../services/transactions.service');

jest.mock('../middleware/logger', () => (req, res, next) => next());

const app = require('../app');

// ─── POST /api/ai/categorize ──────────────────────────────────────────────────
describe('POST /api/ai/categorize', () => {

  beforeEach(() => {
    mockGeminiRisposta = 'Cibo';
  });

  test('restituisce una categoria valida per una uscita', async () => {
    const res = await request(app)
      .post('/api/ai/categorize')
      .send({ description: 'Pizza con amici', type: 'uscita' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('category');
    expect(res.body.category).toBe('Cibo');
  });

  // ✅ NUOVO: verifica le categorie di entrata (diverse da quelle di uscita)
  test('restituisce una categoria valida per una entrata', async () => {
    mockGeminiRisposta = 'Stipendio';

    const res = await request(app)
      .post('/api/ai/categorize')
      .send({ description: 'Bonifico datore di lavoro', type: 'entrata' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('category');
    expect(res.body.category).toBe('Stipendio');
  });

  test('restituisce 400 se mancano description o type', async () => {
    const res = await request(app)
      .post('/api/ai/categorize')
      .send({ description: 'Test senza type' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('usa "Altro" se Gemini risponde una categoria non valida', async () => {
    mockGeminiRisposta = 'RispostaInvalida';

    const res = await request(app)
      .post('/api/ai/categorize')
      .send({ description: 'Qualcosa di strano', type: 'uscita' });

    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Altro');
  });

});

// ─── GET /api/ai/advice ───────────────────────────────────────────────────────
describe('GET /api/ai/advice', () => {

  beforeEach(() => {
    mockGeminiRisposta = '💡 Stai risparmiando bene!';
  });

  test('restituisce un consiglio finanziario se ci sono transazioni', async () => {
    service.getAllTransactions.mockResolvedValue({
      allFilteredTransactions: [
        { type: 'entrata', amount: '1500', category: 'Stipendio' },
        { type: 'uscita',  amount: '300',  category: 'Cibo' }
      ]
    });

    const res = await request(app).get('/api/ai/advice');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('advice');
    expect(typeof res.body.advice).toBe('string');
  });

  test('restituisce messaggio di default se non ci sono transazioni', async () => {
    service.getAllTransactions.mockResolvedValue({
      allFilteredTransactions: []
    });

    const res = await request(app).get('/api/ai/advice');

    expect(res.status).toBe(200);
    expect(res.body.advice).toContain('Non ci sono ancora transazioni');
  });

});