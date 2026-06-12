const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Accesso negato. Token mancante.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Contiene { id, username }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token non valido o scaduto.' });
  }
};