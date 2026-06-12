// Middleware di gestione errori centralizzata
// Deve avere ESATTAMENTE 4 parametri (err, req, res, next) per essere
// riconosciuto da Express come error handler

function errorHandler(err, req, res, next) {
  // Log dell'errore sul server (visibile in console)
  console.error(`[ERROR] ${req.method} ${req.url} →`, err.message);

  // Determina lo status code: usa quello dell'errore se presente, altrimenti 500
  const statusCode = err.status || err.statusCode || 500;

  // Risposta JSON uniforme per tutti gli errori
  res.status(statusCode).json({
    error: err.message || 'Errore interno del server',
    // In sviluppo mostra anche lo stack trace per debugging
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}

module.exports = errorHandler;