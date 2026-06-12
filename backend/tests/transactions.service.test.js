// ─── transactions.service.test.js ────────────────────────────────────────────
// Test UNITARI del service: mockiamo il pool e verifichiamo che la logica
// (paginazione, costruzione query, parametri) sia corretta senza toccare il DB.

jest.mock('../db/pool');
const pool = require('../db/pool');

const service = require('../services/transactions.service');

// ─── Helper ───────────────────────────────────────────────────────────────────
// getAllTransactions chiama pool.query TRE volte (COUNT, pagina, tutti).
// Questo helper imposta le tre risposte in sequenza.
function mockPoolQuerySequence(total, rows) {
  pool.query
    .mockResolvedValueOnce([[{ total }]])   // 1° chiamata: COUNT(*)
    .mockResolvedValueOnce([rows])           // 2° chiamata: pagina corrente
    .mockResolvedValueOnce([rows]);          // 3° chiamata: tutti i filtrati
}

// ─── getAllTransactions ───────────────────────────────────────────────────────
describe('getAllTransactions', () => {

  beforeEach(() => jest.clearAllMocks());

  test('restituisce transactions, totalPages e currentPage corretti', async () => {
    const fakeRows = [
      { id: 1, description: 'Stipendio', amount: '1500', type: 'entrata', category: 'Stipendio' }
    ];
    mockPoolQuerySequence(1, fakeRows);

    const result = await service.getAllTransactions({ page: 1, limit: 10 });

    expect(result.transactions).toEqual(fakeRows);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.allFilteredTransactions).toEqual(fakeRows);
  });

  test('calcola la paginazione correttamente (25 record, limit 10 → 3 pagine)', async () => {
    mockPoolQuerySequence(25, []);

    const result = await service.getAllTransactions({ page: 2, limit: 10 });

    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(2);
  });

  test('aggiunge filtro LIKE quando viene passato search', async () => {
    mockPoolQuerySequence(0, []);

    await service.getAllTransactions({ search: 'pizza' });

    // La seconda chiamata è la query paginata — verifichiamo che i parametri
    // contengano il pattern LIKE con i wildcard
    const secondCallArgs = pool.query.mock.calls[1];
    expect(secondCallArgs[1]).toContain('%pizza%');
  });

  test('aggiunge filtro categoria quando category non è "Tutte"', async () => {
    mockPoolQuerySequence(0, []);

    await service.getAllTransactions({ category: 'Cibo' });

    const secondCallArgs = pool.query.mock.calls[1];
    expect(secondCallArgs[1]).toContain('Cibo');
  });

  test('NON aggiunge filtro categoria quando category è "Tutte"', async () => {
    mockPoolQuerySequence(0, []);

    await service.getAllTransactions({ category: 'Tutte' });

    const secondCallArgs = pool.query.mock.calls[1];
    expect(secondCallArgs[1]).not.toContain('Tutte');
  });

  test('aggiunge filtro mese quando month è presente', async () => {
    mockPoolQuerySequence(0, []);

    await service.getAllTransactions({ month: '2024-07' });

    const secondCallArgs = pool.query.mock.calls[1];
    expect(secondCallArgs[1]).toContain('2024-07');
  });

  test('usa valori di default (page=1, limit=10) se i parametri mancano', async () => {
    mockPoolQuerySequence(0, []);

    await service.getAllTransactions({});

    // LIMIT 10 OFFSET 0 devono essere gli ultimi due parametri della query paginata
    const secondCallArgs = pool.query.mock.calls[1];
    const params = secondCallArgs[1];
    expect(params[params.length - 2]).toBe(10); // LIMIT
    expect(params[params.length - 1]).toBe(0);  // OFFSET
  });

  test('totalPages è almeno 1 anche con 0 record', async () => {
    mockPoolQuerySequence(0, []);

    const result = await service.getAllTransactions({});

    expect(result.totalPages).toBe(1);
  });

});

// ─── createTransaction ────────────────────────────────────────────────────────
describe('createTransaction', () => {

  beforeEach(() => jest.clearAllMocks());

  test('chiama pool.query con i parametri corretti e restituisce il risultato', async () => {
    const fakeResult = { insertId: 42, affectedRows: 1 };
    pool.query.mockResolvedValueOnce([fakeResult]);

    const data = { description: 'Spesa', amount: 45.5, type: 'uscita', category: 'Cibo' };
    const result = await service.createTransaction(data);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO transactions/i);
    expect(params).toEqual(['Spesa', 45.5, 'uscita', 'Cibo']);
    expect(result).toEqual(fakeResult);
  });

});

// ─── updateTransaction ────────────────────────────────────────────────────────
describe('updateTransaction', () => {

  beforeEach(() => jest.clearAllMocks());

  test('chiama pool.query con id e campi aggiornati', async () => {
    const fakeResult = { affectedRows: 1 };
    pool.query.mockResolvedValueOnce([fakeResult]);

    const data = { description: 'Affitto', amount: 700, type: 'uscita', category: 'Affitto' };
    const result = await service.updateTransaction(5, data);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/UPDATE transactions/i);
    expect(params).toEqual(['Affitto', 700, 'uscita', 'Affitto', 5]);
    expect(result).toEqual(fakeResult);
  });

});

// ─── deleteTransaction ────────────────────────────────────────────────────────
describe('deleteTransaction', () => {

  beforeEach(() => jest.clearAllMocks());

  test('chiama pool.query con l\'id corretto', async () => {
    const fakeResult = { affectedRows: 1 };
    pool.query.mockResolvedValueOnce([fakeResult]);

    const result = await service.deleteTransaction(3);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM transactions/i);
    expect(params).toEqual([3]);
    expect(result).toEqual(fakeResult);
  });

});