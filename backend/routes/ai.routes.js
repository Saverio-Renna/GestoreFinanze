const express = require('express');
const router = express.Router();
const controller = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware); // Protegge l'accesso alle funzionalità IA

router.post('/categorize', controller.categorize);
router.get('/advice', controller.getAdvice);

module.exports = router;