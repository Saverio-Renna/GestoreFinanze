// tests/setup.js
// Questo file viene eseguito da Jest dopo tutti i test (globalTeardown).
// Chiude il pool MySQL in modo ordinato così Jest non deve forzare l'uscita.
 
const pool = require('../db/pool');
 
afterAll(async () => {
  await pool.end();
});
 