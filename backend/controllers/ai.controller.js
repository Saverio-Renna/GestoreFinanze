const { GoogleGenerativeAI } = require('@google/generative-ai');
const service = require('../services/transactions.service');

// Verifica chiave all'avvio
if (!process.env.GEMINI_API_KEY) {
  console.error("⚠️  GEMINI_API_KEY mancante nel file .env!");
}

// Inizializza Gemini con il modello aggiornato
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Codice aggiornato
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
// in alternativa puoi usare "gemini-2.5-flash"

// ─── 1. Auto-categorizzazione ─────────────────────────────────────────────────
async function categorize(req, res) {
  try {
    const { description, type } = req.body;
    if (!description || !type) {
      return res.status(400).json({ error: "description e type sono obbligatori" });
    }

    const categorieEntrata = ["Stipendio", "Regalo", "Investimenti", "Altro"];
    const categorieUscita  = ["Cibo", "Trasporti", "Affitto", "Svago", "Altro"];
    const categoriePossibili = type === 'entrata' ? categorieEntrata : categorieUscita;

    const prompt = `Sei un assistente finanziario. L'utente ha inserito una transazione di tipo "${type}" con questa descrizione: "${description}".
Scegli la categoria più adatta ESCLUSIVAMENTE tra le seguenti: ${categoriePossibili.join(", ")}.
Rispondi fornendo SOLO il nome della categoria esatta, senza punteggiatura o altre parole. Se non sei sicuro, rispondi "Altro".`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Validazione: se Gemini risponde qualcosa di non previsto, usiamo "Altro"
    const finalCategory = categoriePossibili.includes(responseText) ? responseText : "Altro";

    res.json({ category: finalCategory });
  } catch (err) {
    console.error("Errore /categorize:", err.message);
    res.status(500).json({ error: err.message });
  }
}

// ─── 2. Consigli finanziari ───────────────────────────────────────────────────
async function getAdvice(req, res) {
  try {
    // Recupera tutte le transazioni (senza filtri, senza paginazione)
    const data = await service.getAllTransactions({ page: 1, limit: 999999 });
    const transactions = data.allFilteredTransactions;

    if (!transactions || transactions.length === 0) {
      return res.json({
        advice: "Non ci sono ancora transazioni registrate. Inizia ad aggiungere le tue spese e entrate per ricevere consigli personalizzati!"
      });
    }

    // Calcola i totali da passare a Gemini
    const entrate = transactions
      .filter(t => t.type === 'entrata')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const uscite = transactions
      .filter(t => t.type === 'uscita')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const uscitePerCategoria = transactions
      .filter(t => t.type === 'uscita')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
        return acc;
      }, {});

    const tassoRisparmio = entrate > 0
      ? ((entrate - uscite) / entrate * 100).toFixed(1)
      : 0;

    const prompt = `Sei un esperto consulente finanziario personale. Ecco il riepilogo finanziario dell'utente basato su ${transactions.length} transazioni registrate:

- Totale Entrate: €${entrate.toFixed(2)}
- Totale Uscite: €${uscite.toFixed(2)}
- Saldo netto: €${(entrate - uscite).toFixed(2)}
- Tasso di risparmio: ${tassoRisparmio}%
- Spese per categoria: ${JSON.stringify(uscitePerCategoria, null, 2)}

Scrivi 3 consigli finanziari pratici e specifici in italiano, con tono professionale ma incoraggiante.
Analizza se ci sono categorie dove spende troppo, commenta il tasso di risparmio e dai suggerimenti concreti.
Usa emoji per i titoli dei consigli. Massimo 200 parole totali.`;

    const result = await model.generateContent(prompt);
    const advice = result.response.text().trim();

    res.json({ advice });
  } catch (err) {
    console.error("Errore /advice:", err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { categorize, getAdvice };