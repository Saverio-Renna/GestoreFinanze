const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('❌ Errore Client Redis:', err));
redisClient.on('connect', () => console.log('🔌 Connesso a Redis con successo'));

// Connessione asincrona immediata all'avvio dell'applicazione
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Impossibile stabilire la connessione con Redis:', error);
  }
})();

module.exports = redisClient;