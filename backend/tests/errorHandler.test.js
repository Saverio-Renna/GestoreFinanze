// ─── errorHandler.test.js ─────────────────────────────────────────────────────
// Test UNITARI del middleware errorHandler.
// Lo testiamo direttamente (non tramite Supertest) perché è pura logica:
// costruiamo req/res finti con jest.fn() e verifichiamo il comportamento.

const errorHandler = require('../middleware/errorHandler');

// ─── Helper: crea oggetti req/res/next finti ──────────────────────────────────
function buildMocks() {
  const req = { method: 'GET', url: '/test' };

  const res = {
    status: jest.fn().mockReturnThis(), // .status(x) ritorna res per il chaining
    json:   jest.fn().mockReturnThis()
  };

  const next = jest.fn();

  return { req, res, next };
}

// ─── Test ─────────────────────────────────────────────────────────────────────
describe('errorHandler middleware', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  // ✅ BONUS 1: usa 500 come status code di default
  test('usa 500 come status code di default se err non ha status', () => {
    const { req, res, next } = buildMocks();
    const err = new Error('Qualcosa è andato storto');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Qualcosa è andato storto' })
    );
  });

  // ✅ BONUS 2: rispetta err.status se presente
  test('usa err.status se presente (es. 404)', () => {
    const { req, res, next } = buildMocks();
    const err = new Error('Non trovato');
    err.status = 404;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  // ✅ BONUS 3: rispetta err.statusCode come alternativa
  test('usa err.statusCode se err.status non è presente (es. 422)', () => {
    const { req, res, next } = buildMocks();
    const err = new Error('Dati non validi');
    err.statusCode = 422;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  // ✅ BONUS 4: in development include lo stack trace, in production no
  test('include stack trace in development ma non in production', () => {
    const { req, res: resDev } = buildMocks();
    const err = new Error('Errore dev');

    process.env.NODE_ENV = 'development';
    errorHandler(err, req, resDev, jest.fn());
    const devBody = resDev.json.mock.calls[0][0];
    expect(devBody).toHaveProperty('stack');

    const { req: req2, res: resProd } = buildMocks();
    process.env.NODE_ENV = 'production';
    errorHandler(err, req2, resProd, jest.fn());
    const prodBody = resProd.json.mock.calls[0][0];
    expect(prodBody).not.toHaveProperty('stack');
  });

});