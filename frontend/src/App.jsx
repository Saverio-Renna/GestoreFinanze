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
    // **grassetto**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // *corsivo*
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Titoli numerati: "1. testo" → riga con margine
    .replace(/^(\d+\.\s)/gm, "<br/><span style='font-weight:bold'>$1</span>")
    // Righe vuote → spazio
    .replace(/\n\n/g, "<br/><br/>")
    // Newline singoli → spazio
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
    <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <h1>Gestionale Finanze</h1>

      {/* FORM DI INSERIMENTO */}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.2rem" }}>
          <input type="text" placeholder="Descrizione" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }} />
          <button type="button" onClick={handleAutoCategorize} disabled={isCategorizing || !form.description} style={{ padding: "0.5rem", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: isCategorizing ? "wait" : "pointer" }} title="Lascia che l'IA scelga la categoria">
            {isCategorizing ? "⏳" : "✨"}
          </button>
        </div>
        <input type="number" step="0.01" placeholder="Importo" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", width: "120px" }} />
        <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px" }}>
          <option value="entrata">Entrata</option>
          <option value="uscita">Uscita</option>
        </select>
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ padding: "0.5rem", borderRadius: "4px" }}>
          {CATEGORIES[form.type].map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button type="submit" style={{ padding: "0.5rem 1rem", backgroundColor: "#646cff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Aggiungi</button>
      </form>

      {loading && <p>Caricamento dati...</p>}

      {/* CARTE STATISTICHE */}
      <div style={{ display: "flex", gap: "1rem", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap" }}>
        <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", flex: 1, backgroundColor: "#1e1e1e", color: "#fff", minWidth: "200px" }}>
          <h3>Saldo Filtrato</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>€ {saldo.toFixed(2)}</p>
        </div>
        <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", flex: 1, backgroundColor: "#1e1e1e", color: "#4ade80", minWidth: "200px" }}>
          <h3>Totale Entrate</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>€ {entrate.toFixed(2)}</p>
        </div>
        <div style={{ padding: "1rem", border: "1px solid #ccc", borderRadius: "8px", flex: 1, backgroundColor: "#1e1e1e", color: "#f87171", minWidth: "200px" }}>
          <h3>Totale Uscite</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold" }}>€ {uscite.toFixed(2)}</p>
        </div>
      </div>

      {/* 🤖 IA FINANCIAL ADVISOR */}
      <div style={{ backgroundColor: "#1e1e2f", padding: "1.5rem", borderRadius: "8px", marginBottom: "2rem", border: "1px solid #4ade80", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
          <h3 style={{ margin: 0, color: "#4ade80" }}>🤖 AI Financial Advisor</h3>
          <button
            onClick={fetchAiAdvice}
            disabled={loadingAdvice}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#4ade80", color: "#1e1e1e", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: loadingAdvice ? "wait" : "pointer" }}
          >
            {loadingAdvice ? "Analisi in corso..." : "Genera Analisi"}
          </button>
        </div>

        {/* Testo con Markdown renderizzato */}
        {aiAdvice ? (
          <div
            style={{ color: "#e2e8f0", lineHeight: "1.8", fontSize: "0.97rem" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(aiAdvice) }}
          />
        ) : (
          <p style={{ color: "#888", fontStyle: "italic", margin: 0 }}>
            Clicca su &apos;Genera Analisi&apos; per ottenere consigli personalizzati basati sulle tue transazioni attuali.
          </p>
        )}
      </div>

      {/* GRAFICI */}
      {allFilteredTransactions.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", marginBottom: "2rem", backgroundColor: "#2d2d2d", borderRadius: "8px", padding: "1rem" }}>
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
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1a1a1a", padding: "1rem", borderRadius: "8px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input type="text" placeholder="Cerca descrizione..." value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #444", backgroundColor: "#2d2d2d", color: "#fff" }} />
          <select value={filters.category} onChange={(e) => handleFilterChange("category", e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px", backgroundColor: "#2d2d2d", color: "#fff", border: "1px solid #444" }}>
            <option value="Tutte">Tutte le categorie</option>
            {tutteLeCategorieUnivoche.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <input type="month" value={filters.month} onChange={(e) => handleFilterChange("month", e.target.value)} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #444", backgroundColor: "#2d2d2d", color: "#fff" }} />
          {(filters.search || filters.category !== "Tutte" || filters.month) && (
            <button onClick={() => setFilters({ search: "", category: "Tutte", month: "" })} style={{ padding: "0.5rem 1rem", backgroundColor: "#d32f2f", color: "white", border: "none", borderRadius: "4px" }}>Resetta Filtri</button>
          )}
        </div>
        <button onClick={exportToCSV} style={{ padding: "0.5rem 1rem", backgroundColor: "#2e7d32", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold" }}>📥 Esporta CSV</button>
      </div>

      {/* TABELLA */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#1a1a1a", color: "white" }}>
            <th style={{ padding: "0.5rem", border: "1px solid #444" }}>Descrizione</th>
            <th style={{ padding: "0.5rem", border: "1px solid #444" }}>Importo</th>
            <th style={{ padding: "0.5rem", border: "1px solid #444" }}>Tipo</th>
            <th style={{ padding: "0.5rem", border: "1px solid #444" }}>Categoria</th>
            <th style={{ padding: "0.5rem", border: "1px solid #444" }}>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 ? (
            <tr><td colSpan="5" style={{ padding: "1rem", textAlign: "center", border: "1px solid #444" }}>Nessuna transazione disponibile</td></tr>
          ) : (
            transactions.map((t) => (
              <tr key={t.id} style={{ textAlign: "center", backgroundColor: t.type === 'entrata' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)' }}>
                {editingId === t.id ? (
                  <>
                    <td style={{ padding: "0.5rem", border: "1px solid #444" }}><input value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} /></td>
                    <td style={{ padding: "0.5rem", border: "1px solid #444" }}><input type="number" step="0.01" value={editData.amount} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} style={{ width: "80px" }} /></td>
                    <td style={{ padding: "0.5rem", border: "1px solid #444" }}><select value={editData.type} onChange={(e) => setEditData({ ...editData, type: e.target.value, category: CATEGORIES[e.target.value][0] })}><option value="entrata">Entrata</option><option value="uscita">Uscita</option></select></td>
                    <td style={{ padding: "0.5rem", border: "1px solid #444" }}><select value={editData.category} onChange={(e) => setEditData({ ...editData, category: e.target.value })}>{CATEGORIES[editData.type || 'entrata'].map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></td>
                    <td style={{ padding: "0.5rem", border: "1px solid #444" }}><button onClick={() => handleUpdate(t.id)} style={{ marginRight: "0.5rem" }}>Salva</button><button onClick={() => setEditingId(null)}>Annulla</button></td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: "0.5rem", border: "1px solid #444" }}>{t.description}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #444", fontWeight: "bold" }}>€ {Number(t.amount).toFixed(2)}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #444", textTransform: "capitalize" }}>{t.type}</td>
                    <td style={{ padding: "0.5rem", border: "1px solid #444" }}><span style={{ backgroundColor: "#444", padding: "2px 8px", borderRadius: "12px", fontSize: "0.85rem" }}>{t.category || "Nessuna"}</span></td>
                    <td style={{ padding: "0.5rem", border: "1px solid #444" }}><button onClick={() => { setEditingId(t.id); setEditData(t); }} style={{ marginRight: "0.5rem" }}>Modifica</button><button onClick={() => handleDelete(t.id)} style={{ backgroundColor: "#c2185b", color: "white", border: "none", padding: "3px 8px", borderRadius: "4px", cursor: "pointer" }}>Elimina</button></td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINAZIONE */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1.5rem" }}>
        <button disabled={page === 1} onClick={() => setPage(prev => Math.max(prev - 1, 1))} style={{ padding: "0.5rem 1rem", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>◀ Precedente</button>
        <span>Pagina <strong>{page}</strong> di {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(prev => Math.min(prev + 1, totalPages))} style={{ padding: "0.5rem 1rem", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>Successivo ▶</button>
      </div>
    </div>
  );
}

export default App;