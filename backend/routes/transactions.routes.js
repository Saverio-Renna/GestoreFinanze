const express = require('express');
const router = express.Router();
const controller = require('../controllers/transactions.controller');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache.middleware');
const authMiddleware = require('../middleware/auth.middleware');

// Proteggiamo TUTTE le rotte delle transazioni
router.use(authMiddleware);

const clearTransactionsCache = async (req, res, next) => {
  await invalidateCache(`cache:${req.user.id}:/api/transactions*`);
  next();
};

router.get('/', cacheMiddleware(300), controller.getAll);
router.post('/', clearTransactionsCache, controller.create);
router.put('/:id', clearTransactionsCache, controller.update);
router.delete('/:id', clearTransactionsCache, controller.remove);

module.exports = router;