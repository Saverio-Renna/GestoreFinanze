const express = require('express');
const router = express.Router();
const controller = require('../controllers/ai.controller');

router.post('/categorize', controller.categorize);
router.get('/advice', controller.getAdvice);

module.exports = router;