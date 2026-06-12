const service = require('../services/transactions.service');

async function getAll(req, res) {
  try {
    // Passiamo al service l'ID utente estratto dal middleware di autenticazione
    const queryData = { ...req.query, userId: req.user.id };
    const data = await service.getAllTransactions(queryData);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const insertData = { ...req.body, userId: req.user.id };
    const result = await service.createTransaction(insertData);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const updateData = { ...req.body, userId: req.user.id };
    const result = await service.updateTransaction(req.params.id, updateData);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Transazione non trovata o non autorizzata." });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const result = await service.deleteTransaction(req.params.id, req.user.id);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Transazione non trovata o non autorizzata." });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, remove };