const redisClient = require('../config/redis');

const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    const userId = req.user ? req.user.id : 'anonymous';
    const key = `cache:${userId}:${req.originalUrl || req.url}`;

    try {
      const cachedResponse = await redisClient.get(key);
      if (cachedResponse) {
        console.log(`⚡ Dati recuperati dalla cache (Key: ${key})`);
        return res.status(200).json(JSON.parse(cachedResponse));
      }

      // Intercettazione sicura della risposta originale
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Salviamo in Redis in background senza bloccare il flusso
        redisClient.setEx(key, duration, JSON.stringify(body))
          .catch(err => console.error('⚠️ Errore salvataggio Redis:', err));
        
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('⚠️ Errore nel middleware di cache Redis:', error);
      next(); // Passa oltre se Redis è down
    }
  };
};

const invalidateCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      // Metodo iterativo a prova di bomba per cancellare le chiavi
      for (const key of keys) {
        await redisClient.del(key);
      }
      console.log(`🧹 Cache rimossa con successo per: ${keys.join(', ')}`);
    }
  } catch (error) {
    console.error('⚠️ Errore durante l\'invalidazione della cache:', error);
  }
};

module.exports = { cacheMiddleware, invalidateCache };