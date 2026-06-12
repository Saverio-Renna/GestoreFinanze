const pool = require('../db/pool');

// READ PAGINATA CON FILTRI (Isolata per utente)
async function getAllTransactions(queryParams = {}) {
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 10;
  const offset = (page - 1) * limit;
  const { search, category, month, userId } = queryParams;

  // BASE WHERE: Filtra SEMPRE per l'utente loggato
  let baseWhere = ' WHERE user_id = ?';
  const params = [userId];

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

  const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM transactions ${baseWhere}`, params);
  const total = countRows[0].total;
  const totalPages = Math.ceil(total / limit);

  const paginatedQuery = `SELECT * FROM transactions ${baseWhere} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(paginatedQuery, [...params, limit, offset]);

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
  const { description, amount, type, category, userId } = data;
  const [result] = await pool.query(
    'INSERT INTO transactions (description, amount, type, category, user_id) VALUES (?, ?, ?, ?, ?)',
    [description, amount, type, category, userId]
  );
  return result;
}

// UPDATE (Modifica solo se la transazione appartiene all'utente)
async function updateTransaction(id, data) {
  const { description, amount, type, category, userId } = data;
  const [result] = await pool.query(
    `UPDATE transactions SET description = ?, amount = ?, type = ?, category = ? WHERE id = ? AND user_id = ?`,
    [description, amount, type, category, id, userId]
  );
  return result;
}

// DELETE (Elimina solo se la transazione appartiene all'utente)
async function deleteTransaction(id, userId) {
  const [result] = await pool.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
  return result;
}

module.exports = { getAllTransactions, createTransaction, updateTransaction, deleteTransaction };