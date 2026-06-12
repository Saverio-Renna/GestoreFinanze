import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import "./App.css";

const CATEGORIES = {
  entrata: ["Stipendio", "Regalo", "Investimenti", "Altro"],
  uscita: ["Cibo", "Trasporti", "Affitto", "Svago", "Altro"]
};

const API_URL = "http://localhost:5000";

// ─── Converte Markdown semplice in HTML ──────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^(\d+\.\s)/gm, "<br/><span style='font-weight:bold'>$1</span>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, " ");
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [allFilteredTransactions, setAllFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [aiAdvice, setAiAdvice] = useState("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: "", category: "Tutte", month: "" });

  const [form, setForm] = useState({ description: "", amount: "", type: "entrata", category: "Stipendio" });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const fetchTransactions = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: page,
        limit: 10,
        search: filters.search,
        category: filters.category,
        month: filters.month
      }).toString();

      const res = await fetch(`${API_URL}/api/transactions?${queryParams}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Errore nel server");

      setTransactions(data.transactions || []);
      setAllFilteredTransactions(data.allFilteredTransactions || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("ERRORE FETCH:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, filters.search, filters.category, filters.month]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleTypeChange = (newType) => {
    setForm({ ...form, type: newType, category: CATEGORIES[newType][0] });
  };

  const handleAutoCategorize = async () => {
    if (!form.description) return alert("Scrivi prima una descrizione!");
    setIsCategorizing(true);
    try {
      const res = await fetch(`${API_URL}/api/ai/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: form.description, type: form.type })
      });
      const data = await res.json();
      if (res.ok && data.category) {
        setForm({ ...form, category: data.category });
      }
    } catch (err) {
      console.error("Errore IA:", err);
    } finally {
      setIsCategorizing(false);
    }
  };

  const fetchAiAdvice = async () => {
    setLoadingAdvice(true);
    setAiAdvice("");
    try {
      const res = await fetch(`${API_URL}/api/ai/advice`);
      const data = await res.json();
      if (res.ok && data.advice) {
        setAiAdvice(data.advice);
      }
    } catch (err) {
      setAiAdvice("Errore nel caricamento del consiglio.");
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return alert("Compila tutti i campi");
    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("ERRORE DATABASE: " + (data.error || "Impossibile inserire"));
        return;
      }
      setForm({ description: "", amount: "", type: "entrata", category: "Stipendio" });
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert("Errore di Rete: Impossibile contattare il backend.");
    }
  };

  const handleUpdate = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (!res.ok) {
        const data = await res.json();
        alert("Errore Modifica: " + data.error);
        return;
      }
      setEditingId(null);
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Sicuro di voler eliminare questa transazione?")) return;
    try {
      await fetch(`${API_URL}/api/transactions/${id}`, { method: "DELETE" });
      fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const exportToCSV = () => {
    if (allFilteredTransactions.length === 0) return alert("Nessun dato da esportare");
    const headers = ["ID", "Descrizione", "Importo", "Tipo", "Categoria", "Data Creazione"];
    const rows = allFilteredTransactions.map(t => [
      t.id, `"${t.description.replace(/"/g, '""')}"`, t.amount, t.type, t.category, t.created_at
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transazioni_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const entrate = allFilteredTransactions.filter(t => t.type === "entrata").reduce((acc, t) => acc + Number(t.amount), 0);
  const uscite = allFilteredTransactions.filter(t => t.type === "uscita").reduce((acc, t) => acc + Number(t.amount), 0);
  const saldo = entrate - uscite;

  const dataBilancio = [{ name: "Entrate", value: entrate }, { name: "Uscite", value: uscite }];
  const COLORS_BILANCIO = ["#4ade80", "#f87171"];

  const categorieRaggruppate = allFilteredTransactions.filter(t => t.type === "uscita").reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {});
  const dataCategorieUscite = Object.keys(categorieRaggruppate).map(cat => ({ name: cat, value: categorieRaggruppate[cat] }));
  const COLORS_CATEGORIE = ["#f87171", "#fb923c", "#fbbf24", "#60a5fa", "#c084fc"];

  const tutteLeCategorieUnivoche = Array.from(new Set(Object.values(CATEGORIES).flat()));

  return (
    <div className="container">
      <h1>Gestionale Finanze</h1>

      {/* FORM DI INSERIMENTO */}
      <form onSubmit={handleSubmit} className="form-inserimento">
        <div className="input-group">
          <input
            type="text"
            placeholder="Descrizione"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button
            type="button"
            className="btn-ai"
            onClick={handleAutoCategorize}
            disabled={isCategorizing || !form.description}
            title="Lascia che l'IA scelga la categoria"
          >
            {isCategorizing ? "⏳" : "✨"}
          </button>
        </div>
        <input
          type="number"
          step="0.01"
          placeholder="Importo"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="entrata">Entrata</option>
          <option value="uscita">Uscita</option>
        </select>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES[form.type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button type="submit" className="btn-aggiungi">Aggiungi</button>
      </form>

      {loading && <p>Caricamento dati...</p>}

      {/* CARTE STATISTICHE */}
      <div className="statistiche">
        <div className="stat-card saldo">
          <h3>Saldo Filtrato</h3>
          <p className="stat-valore">€ {saldo.toFixed(2)}</p>
        </div>
        <div className="stat-card entrate">
          <h3>Totale Entrate</h3>
          <p className="stat-valore">€ {entrate.toFixed(2)}</p>
        </div>
        <div className="stat-card uscite">
          <h3>Totale Uscite</h3>
          <p className="stat-valore">€ {uscite.toFixed(2)}</p>
        </div>
      </div>

      {/* AI FINANCIAL ADVISOR */}
      <div className="ai-advisor">
        <div className="ai-advisor-header">
          <h3>🤖 AI Financial Advisor</h3>
          <button className="btn-analisi" onClick={fetchAiAdvice} disabled={loadingAdvice}>
            {loadingAdvice ? "Analisi in corso..." : "Genera Analisi"}
          </button>
        </div>
        {aiAdvice ? (
          <div
            className="ai-advice-text"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAdvice) }}
          />
        ) : (
          <p className="ai-advice-placeholder">
            Clicca su &apos;Genera Analisi&apos; per ottenere consigli personalizzati basati sulle tue transazioni attuali.
          </p>
        )}
      </div>

      {/* GRAFICI */}
      {allFilteredTransactions.length > 0 && (
        <div className="grafici">
          <div>
            <h4>Bilancio Filtrato</h4>
            <PieChart width={300} height={250}>
              <Pie data={dataBilancio} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                {dataBilancio.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_BILANCIO[index % COLORS_BILANCIO.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
              <Legend />
            </PieChart>
          </div>
          {dataCategorieUscite.length > 0 && (
            <div>
              <h4>Analisi Spese (Filtro Corrente)</h4>
              <PieChart width={300} height={250}>
                <Pie data={dataCategorieUscite} cx="50%" cy="50%" outerRadius={80} label dataKey="value">
                  {dataCategorieUscite.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS_CATEGORIE[index % COLORS_CATEGORIE.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => `€ ${Number(value).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </div>
          )}
        </div>
      )}

      {/* BARRA DEI FILTRI */}
      <div className="barra-filtri">
        <div className="filtri-gruppo">
          <input
            type="text"
            placeholder="Cerca descrizione..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
          <select value={filters.category} onChange={(e) => handleFilterChange("category", e.target.value)}>
            <option value="Tutte">Tutte le categorie</option>
            {tutteLeCategorieUnivoche.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input
            type="month"
            value={filters.month}
            onChange={(e) => handleFilterChange("month", e.target.value)}
          />
          {(filters.search || filters.category !== "Tutte" || filters.month) && (
            <button className="btn-reset" onClick={() => setFilters({ search: "", category: "Tutte", month: "" })}>
              Resetta Filtri
            </button>
          )}
        </div>
        <button className="btn-export" onClick={exportToCSV}>📥 Esporta CSV</button>
      </div>

      {/* TABELLA */}
      <table className="tabella-transazioni">
        <thead>
          <tr>
            <th>Descrizione</th>
            <th>Importo</th>
            <th>Tipo</th>
            <th>Categoria</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr><td colSpan="5" className="vuota">Nessuna transazione disponibile</td></tr>
          ) : (
            transactions.map((t) => (
              <tr key={t.id} className={t.type === 'entrata' ? 'riga-entrata' : 'riga-uscita'}>
                {editingId === t.id ? (
                  <>
                    <td><input value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} /></td>
                    <td><input type="number" step="0.01" className="input-edit-amount" value={editData.amount} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} /></td>
                    <td>
                      <select value={editData.type} onChange={(e) => setEditData({ ...editData, type: e.target.value, category: CATEGORIES[e.target.value][0] })}>
                        <option value="entrata">Entrata</option>
                        <option value="uscita">Uscita</option>
                      </select>
                    </td>
                    <td>
                      <select value={editData.category} onChange={(e) => setEditData({ ...editData, category: e.target.value })}>
                        {CATEGORIES[editData.type || 'entrata'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="btn-modifica" onClick={() => handleUpdate(t.id)}>Salva</button>
                      <button onClick={() => setEditingId(null)}>Annulla</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{t.description}</td>
                    <td className="importo">€ {Number(t.amount).toFixed(2)}</td>
                    <td className="tipo">{t.type}</td>
                    <td><span className="badge-categoria">{t.category || "Nessuna"}</span></td>
                    <td>
                      <button className="btn-modifica" onClick={() => { setEditingId(t.id); setEditData(t); }}>Modifica</button>
                      <button className="btn-elimina" onClick={() => handleDelete(t.id)}>Elimina</button>
                    </td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINAZIONE */}
      <div className="paginazione">
        <button className="btn-pagina" disabled={page === 1} onClick={() => setPage(prev => Math.max(prev - 1, 1))}>
          ◀ Precedente
        </button>
        <span>Pagina <strong>{page}</strong> di {totalPages}</span>
        <button className="btn-pagina" disabled={page === totalPages} onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}>
          Successivo ▶
        </button>
      </div>
    </div>
  );
}

export default App;