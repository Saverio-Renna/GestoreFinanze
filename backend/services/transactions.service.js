const pool = require('../db/pool');

// READ PAGINATA CON FILTRI
async function getAllTransactions(queryParams = {}) {
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const offset = (page - 1) * limit;
  const { search, category, month } = queryParams;

  let baseWhere = ' WHERE 1=1';
  const params = [];

  if (search) {
    baseWhere += ' AND description LIKE ?';
    params.push(`%${search}%`);
  }
  if (category && category !== 'Tutte') {
    baseWhere += ' AND category = ?';
    params.push(category);
  }
  if (month) {
    baseWhere += ' AND DATE_FORMAT(created_at, "%Y-%m") = ?';
    params.push(month);
  }

  // Conta il totale per la paginazione
  const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM transactions ${baseWhere}`, params);
  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limit);

  // Recupera i record limitati (pagina corrente)
  const paginatedQuery = `SELECT * FROM transactions ${baseWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(paginatedQuery, [...params, limit, offset]);

  // Recupera tutti i record filtrati (senza limite) per grafici e CSV
  const [allFilteredRows] = await pool.query(`SELECT * FROM transactions ${baseWhere} ORDER BY created_at DESC`, params);

  return {
    transactions: rows,
    totalPages: totalPages || 1,
    currentPage: page,
    allFilteredTransactions: allFilteredRows
  };
}

// CREATE
async function createTransaction(data) {
  const { description, amount, type, category } = data;
  const [result] = await pool.query(
    'INSERT INTO transactions (description, amount, type, category) VALUES (?, ?, ?, ?)',
    [description, amount, type, category]
  );
  return result;
}

// UPDATE
async function updateTransaction(id, data) {
  const { description, amount, type, category } = data;
  const [result] = await pool.query(
    `UPDATE transactions SET description = ?, amount = ?, type = ?, category = ? WHERE id = ?`,
    [description, amount, type, category, id]
  );
  return result;
}

// DELETE
async function deleteTransaction(id) {
  const [result] = await pool.query('DELETE FROM transactions WHERE id = ?', [id]);
  return result;
}

module.exports = { getAllTransactions, createTransaction, updateTransaction, deleteTransaction };