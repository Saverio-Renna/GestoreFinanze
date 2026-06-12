const morgan = require('morgan');

// Formato custom: metodo, url, status, tempo risposta, dimensione body
const logFormat = ':method :url :status :response-time ms - :res[content-length] bytes';

// In produzione usa 'combined' (formato Apache completo con IP e user-agent)
// In sviluppo usa il formato custom più leggibile
const logger = morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : logFormat
);

module.exports = logger;