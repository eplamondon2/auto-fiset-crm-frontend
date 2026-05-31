import { useState, useEffect, createContext, useContext } from "react";

const API = "https://alluring-empathy-production-4b07.up.railway.app";

// ── Auth Context ──────────────────────────────────────────
const AuthContext = createContext(null);

function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("crm_token"));

  useEffect(() => {
    if (token) {
      fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => d.user ? setUser(d.user) : logout())
        .catch(logout);
    }
  }, [token]);

  const login = async (email, password) => {
    const r = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (d.token) {
      localStorage.setItem("crm_token", d.token);
      setToken(d.token);
      setUser(d.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("crm_token");
    setToken(null);
    setUser(null);
  };

  const api = async (path, opts = {}) => {
    const r = await fetch(`${API}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts.headers }
    });
    return r.json();
  };

  return <AuthContext.Provider value={{ user, token, login, logout, api }}>{children}</AuthContext.Provider>;
}

// ── Login Page ────────────────────────────────────────────
function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const ok = await login(email, password);
    if (!ok) setError("Courriel ou mot de passe invalide");
    setLoading(false);
  };

  return (
    <div style={styles.loginBg}>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>
          <span style={styles.logoIcon}>🚗</span>
          <div>
            <div style={styles.logoTitle}>AUTO FISET</div>
            <div style={styles.logoSub}>Système CRM</div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Courriel</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="prenom@autofiset.com" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────
function Sidebar({ page, setPage, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth();
  const isDir = user?.role === "directeur";

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Tableau de bord" },
    { id: "leads", icon: "👥", label: "Leads" },
    { id: "walkin", icon: "🚶", label: "Walk-in" },
    { id: "phoneup", icon: "📞", label: "Phone-Up" },
    { id: "webleads", icon: "🌐", label: "Leads Web" },
    { id: "vehicules", icon: "🚗", label: "Véhicules" },
    ...(isDir ? [{ id: "rapports", icon: "📈", label: "Rapports" }] : []),
  ];

  const sideStyle = {
    ...styles.sidebar,
    transform: mobileOpen ? "translateX(0)" : window.innerWidth < 768 ? "translateX(-100%)" : "translateX(0)"
  };

  return (
    <>
      {mobileOpen && <div style={styles.overlay} onClick={() => setMobileOpen(false)} />}
      <div style={sideStyle}>
        <div style={styles.sideHeader}>
          <span style={{ fontSize: 22 }}>🚗</span>
          <div>
            <div style={styles.sideTitle}>AUTO FISET</div>
            <div style={styles.sideRole}>{user?.nom} · {user?.role}</div>
          </div>
        </div>
        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <div key={item.id} style={{ ...styles.navItem, ...(page === item.id ? styles.navActive : {}) }}
              onClick={() => { setPage(item.id); setMobileOpen(false); }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={styles.navItem} onClick={logout}>
          <span>🚪</span><span>Déconnexion</span>
        </div>
      </div>
    </>
  );
}

// ── Dashboard ─────────────────────────────────────────────
function Dashboard() {
  const { api, user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [appels, setAppels] = useState([]);

  useEffect(() => {
    api("/api/leads").then(d => Array.isArray(d) && setLeads(d));
    api("/api/appels").then(d => Array.isArray(d) && setAppels(d));
  }, []);

  const stats = [
    { label: "Leads actifs", value: leads.filter(l => !["vendu","perdu"].includes(l.statut)).length, icon: "👥", color: "#3b82f6" },
    { label: "Nouveaux", value: leads.filter(l => l.statut === "nouveau").length, icon: "🆕", color: "#8b5cf6" },
    { label: "Test drive", value: leads.filter(l => l.statut === "test_drive").length, icon: "🔑", color: "#f59e0b" },
    { label: "Appels manqués", value: appels.filter(a => a.statut === "manqué").length, icon: "📵", color: "#ef4444" },
  ];

  const recent = leads.slice(0, 5);

  const statutColor = { nouveau: "#3b82f6", contacté: "#8b5cf6", test_drive: "#f59e0b", offre: "#f97316", vendu: "#22c55e", perdu: "#6b7280" };

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>Bonjour, {user?.nom?.split(" ")[0]} 👋</h1>
      <div style={styles.statsGrid}>
        {stats.map(s => (
          <div key={s.label} style={{ ...styles.statCard, borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ ...styles.statValue, color: s.color }}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Leads récents</h2>
        {recent.length === 0 ? <p style={styles.empty}>Aucun lead pour l'instant</p> : (
          <div style={styles.table}>
            {recent.map(l => (
              <div key={l.id} style={styles.tableRow}>
                <div style={{ flex: 1 }}>
                  <div style={styles.rowName}>{l.client_nom || "Client inconnu"}</div>
                  <div style={styles.rowSub}>{l.source} · {l.conseiller_nom || "Non assigné"}</div>
                </div>
                <div style={{ ...styles.badge, background: statutColor[l.statut] + "22", color: statutColor[l.statut] }}>
                  {l.statut}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Leads List ────────────────────────────────────────────
function LeadsList({ source, title, icon }) {
  const { api } = useAuth();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api("/api/leads").then(d => {
      if (Array.isArray(d)) {
        setLeads(source ? d.filter(l => l.source === source) : d);
      }
    });
  }, [source]);

  const filtered = leads.filter(l =>
    (l.client_nom || "").toLowerCase().includes(search.toLowerCase()) ||
    (l.client_telephone || "").includes(search)
  );

  const statutColor = { nouveau: "#3b82f6", contacté: "#8b5cf6", test_drive: "#f59e0b", offre: "#f97316", vendu: "#22c55e", perdu: "#6b7280" };
  const sourceIcon = { "walk-in": "🚶", "phone-up": "📞", facebook: "📘", web: "🌐", kijiji: "🏷️" };

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>{icon} {title}</h1>
        <div style={styles.badge2}>{filtered.length} leads</div>
      </div>
      <input style={styles.search} placeholder="Rechercher nom ou téléphone..."
        value={search} onChange={e => setSearch(e.target.value)} />
      <div style={styles.table}>
        {filtered.length === 0 ? <p style={styles.empty}>Aucun lead trouvé</p> : filtered.map(l => (
          <div key={l.id} style={{ ...styles.tableRow, cursor: "pointer" }} onClick={() => setSelected(l)}>
            <div style={{ fontSize: 20 }}>{sourceIcon[l.source] || "👤"}</div>
            <div style={{ flex: 1, marginLeft: 12 }}>
              <div style={styles.rowName}>{l.client_nom || "Client inconnu"}</div>
              <div style={styles.rowSub}>
                {l.client_telephone || "Pas de téléphone"} · {l.conseiller_nom || "Non assigné"}
              </div>
              {l.annee && <div style={styles.rowSub}>{l.annee} {l.marque} {l.modele}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ ...styles.badge, background: statutColor[l.statut] + "22", color: statutColor[l.statut] }}>
                {l.statut}
              </div>
              <div style={{ ...styles.rowSub, marginTop: 4 }}>
                {new Date(l.created_at).toLocaleDateString("fr-CA")}
              </div>
            </div>
          </div>
        ))}
      </div>
      {selected && <LeadModal lead={selected} onClose={() => setSelected(null)} onUpdate={l => {
        setLeads(prev => prev.map(x => x.id === l.id ? { ...x, ...l } : x));
        setSelected(null);
      }} />}
    </div>
  );
}

// ── Lead Modal ────────────────────────────────────────────
function LeadModal({ lead, onClose, onUpdate }) {
  const { api } = useAuth();
  const [statut, setStatut] = useState(lead.statut);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const updated = await api(`/api/leads/${lead.id}`, {
      method: "PATCH",
      body: JSON.stringify({ statut, notes })
    });
    onUpdate(updated);
    setSaving(false);
  };

  const statuts = ["nouveau", "contacté", "test_drive", "offre", "vendu", "perdu"];

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{lead.client_nom || "Client inconnu"}</h2>
          <button style={styles.btnClose} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.infoGrid}>
            <InfoItem label="Téléphone" value={lead.client_telephone} />
            <InfoItem label="Source" value={lead.source} />
            <InfoItem label="Conseiller" value={lead.conseiller_nom} />
            <InfoItem label="Véhicule" value={lead.annee ? `${lead.annee} ${lead.marque} ${lead.modele}` : "—"} />
            <InfoItem label="Budget" value={lead.budget ? `${lead.budget}$` : "—"} />
            <InfoItem label="Échange" value={lead.vehicule_echange || "—"} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Pipeline</label>
            <div style={styles.pipeline}>
              {statuts.map(s => (
                <div key={s} style={{ ...styles.pipelineStep, ...(statut === s ? styles.pipelineActive : {}) }}
                  onClick={() => setStatut(s)}>{s}</div>
              ))}
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Notes</label>
            <textarea style={{ ...styles.input, height: 80, resize: "vertical" }}
              value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes sur ce lead..." />
          </div>
        </div>
        <div style={styles.modalFooter}>
          <button style={styles.btnSecondary} onClick={onClose}>Annuler</button>
          <button style={styles.btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value || "—"}</div>
    </div>
  );
}

// ── New Lead Form ─────────────────────────────────────────
function NewLeadForm({ source, onSaved }) {
  const { api } = useAuth();
  const [form, setForm] = useState({ nom: "", telephone: "", email: "", vehicule: "", budget: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    // Créer client
    const client = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify({ nom: form.nom, telephone: form.telephone, email: form.email, source })
    });
    const clientId = client.existing ? client.client.id : client.id;
    // Créer lead
    await api("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        source,
        notes: form.notes,
        heure_arrivee: source === "walk-in" ? new Date().toISOString() : undefined
      })
    });
    setSaving(false);
    setDone(true);
    setTimeout(() => { setDone(false); onSaved && onSaved(); }, 2000);
    setForm({ nom: "", telephone: "", email: "", vehicule: "", budget: "", notes: "" });
  };

  return (
    <form onSubmit={submit} style={styles.newLeadForm}>
      <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#1e293b" }}>Nouveau lead</h3>
      {done && <div style={styles.success}>✅ Lead créé avec succès !</div>}
      <div style={styles.formGrid}>
        <div style={styles.field}>
          <label style={styles.label}>Nom complet *</label>
          <input style={styles.input} value={form.nom} onChange={e => set("nom", e.target.value)} required placeholder="Jean Tremblay" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Téléphone</label>
          <input style={styles.input} value={form.telephone} onChange={e => set("telephone", e.target.value)} placeholder="418-000-0000" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Courriel</label>
          <input style={styles.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jean@exemple.com" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Notes</label>
          <input style={styles.input} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Intéressé par..." />
        </div>
      </div>
      <button style={styles.btnPrimary} type="submit" disabled={saving}>
        {saving ? "Création..." : "Créer le lead"}
      </button>
    </form>
  );
}

// ── Pages spécifiques ─────────────────────────────────────
function WalkInPage() {
  const [refresh, setRefresh] = useState(0);
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>🚶 Walk-in</h1>
      <NewLeadForm source="walk-in" onSaved={() => setRefresh(r => r + 1)} />
      <LeadsList source="walk-in" title="" icon="" key={refresh} />
    </div>
  );
}

function PhoneUpPage() {
  const [refresh, setRefresh] = useState(0);
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>📞 Phone-Up</h1>
      <NewLeadForm source="phone-up" onSaved={() => setRefresh(r => r + 1)} />
      <LeadsList source="phone-up" title="" icon="" key={refresh} />
    </div>
  );
}

function WebLeadsPage() {
  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>🌐 Leads Web</h1>
      <LeadsList source={null} title="Tous les leads web" icon="" />
    </div>
  );
}

// ── Véhicules ─────────────────────────────────────────────
function VehiculesPage() {
  const { api } = useAuth();
  const [vehicules, setVehicules] = useState([]);

  useEffect(() => {
    api("/api/vehicules").then(d => Array.isArray(d) && setVehicules(d));
  }, []);

  const statutColor = { disponible: "#22c55e", vendu: "#ef4444", reserve: "#f59e0b", archivé: "#6b7280" };

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>🚗 Inventaire</h1>
      <div style={styles.vehiculesGrid}>
        {vehicules.map(v => (
          <div key={v.id} style={styles.vehiculeCard}>
            <div style={styles.vehiculeHeader}>
              <div style={styles.vehiculeTitle}>{v.annee} {v.marque} {v.modele}</div>
              <div style={{ ...styles.badge, background: statutColor[v.statut] + "22", color: statutColor[v.statut] }}>
                {v.statut}
              </div>
            </div>
            {v.trim && <div style={styles.rowSub}>{v.trim}</div>}
            <div style={styles.vehiculeDetails}>
              <span>💰 {v.prix ? Number(v.prix).toLocaleString("fr-CA") + " $" : "—"}</span>
              <span>📍 {v.kilometrage ? Number(v.kilometrage).toLocaleString("fr-CA") + " km" : "—"}</span>
            </div>
            {v.marketplace_id && (
              <div style={{ ...styles.rowSub, marginTop: 6 }}>📘 Marketplace: {v.marketplace_id}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rapports ──────────────────────────────────────────────
function RapportsPage() {
  const { api } = useAuth();
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    api("/api/leads").then(d => Array.isArray(d) && setLeads(d));
  }, []);

  const bySource = ["walk-in", "phone-up", "facebook", "web", "kijiji"].map(s => ({
    source: s, count: leads.filter(l => l.source === s).length
  }));

  const byStatut = ["nouveau", "contacté", "test_drive", "offre", "vendu", "perdu"].map(s => ({
    statut: s, count: leads.filter(l => l.statut === s).length
  }));

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>📈 Rapports</h1>
      <div style={styles.rapportsGrid}>
        <div style={styles.rapportCard}>
          <h3 style={styles.sectionTitle}>Leads par source</h3>
          {bySource.map(s => (
            <div key={s.source} style={styles.rapportRow}>
              <span style={styles.rapportLabel}>{s.source}</span>
              <div style={styles.rapportBar}>
                <div style={{ ...styles.rapportBarFill, width: `${Math.max(s.count * 20, 4)}%` }} />
              </div>
              <span style={styles.rapportCount}>{s.count}</span>
            </div>
          ))}
        </div>
        <div style={styles.rapportCard}>
          <h3 style={styles.sectionTitle}>Pipeline de vente</h3>
          {byStatut.map(s => (
            <div key={s.statut} style={styles.rapportRow}>
              <span style={styles.rapportLabel}>{s.statut}</span>
              <div style={styles.rapportBar}>
                <div style={{ ...styles.rapportBarFill, width: `${Math.max(s.count * 20, 4)}%`, background: "#8b5cf6" }} />
              </div>
              <span style={styles.rapportCount}>{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
function App() {
  const { user } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <LoginPage />;

  const pages = {
    dashboard: <Dashboard />,
    leads: <LeadsList source={null} title="Tous les leads" icon="👥" />,
    walkin: <WalkInPage />,
    phoneup: <PhoneUpPage />,
    webleads: <WebLeadsPage />,
    vehicules: <VehiculesPage />,
    rapports: <RapportsPage />,
  };

  return (
    <div style={styles.appLayout}>
      <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div style={styles.main}>
        <div style={styles.topbar}>
          <button style={styles.menuBtn} onClick={() => setMobileOpen(true)}>☰</button>
          <div style={styles.topbarTitle}>Auto Fiset CRM</div>
        </div>
        <div style={styles.content}>{pages[page]}</div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  loginBg: { minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  loginCard: { background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 25px 50px rgba(0,0,0,0.3)" },
  loginLogo: { display: "flex", alignItems: "center", gap: 14, marginBottom: 32 },
  logoIcon: { fontSize: 40 },
  logoTitle: { fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: 2 },
  logoSub: { fontSize: 12, color: "#64748b", letterSpacing: 1 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, color: "#1e293b", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  error: { background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 },
  success: { background: "#f0fdf4", color: "#16a34a", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 },
  btnPrimary: { width: "100%", padding: "12px 20px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "12px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnClose: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" },
  appLayout: { display: "flex", minHeight: "100vh", background: "#f8fafc" },
  sidebar: { width: 240, background: "#0f172a", color: "#fff", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, transition: "transform 0.3s" },
  sideHeader: { padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 10 },
  sideTitle: { fontSize: 14, fontWeight: 800, letterSpacing: 2 },
  sideRole: { fontSize: 11, color: "#94a3b8" },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", fontSize: 14, color: "#94a3b8", transition: "all 0.2s" },
  navActive: { background: "rgba(59,130,246,0.2)", color: "#fff", borderRight: "3px solid #3b82f6" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 },
  main: { marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", "@media(max-width:768px)": { marginLeft: 0 } },
  topbar: { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 },
  menuBtn: { background: "none", border: "none", fontSize: 20, cursor: "pointer", display: "none" },
  topbarTitle: { fontWeight: 700, fontSize: 16, color: "#1e293b" },
  content: { flex: 1, overflowY: "auto" },
  page: { padding: "24px 20px", maxWidth: 900, margin: "0 auto" },
  pageHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 20px" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 },
  statCard: { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  statValue: { fontSize: 32, fontWeight: 800, margin: "8px 0 4px" },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: 500 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 12 },
  table: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  tableRow: { display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #f1f5f9" },
  rowName: { fontSize: 14, fontWeight: 600, color: "#1e293b" },
  rowSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" },
  badge2: { background: "#e2e8f0", color: "#475569", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20 },
  search: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, marginBottom: 16, outline: "none", boxSizing: "border-box" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e2e8f0" },
  modalBody: { padding: "20px 24px" },
  modalFooter: { display: "flex", gap: 10, justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid #e2e8f0" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 },
  infoItem: { background: "#f8fafc", borderRadius: 8, padding: "10px 12px" },
  infoLabel: { fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 },
  infoValue: { fontSize: 14, color: "#1e293b", fontWeight: 500 },
  pipeline: { display: "flex", gap: 6, flexWrap: "wrap" },
  pipelineStep: { padding: "6px 12px", borderRadius: 20, border: "1.5px solid #e2e8f0", fontSize: 12, cursor: "pointer", color: "#64748b" },
  pipelineActive: { background: "#1e3a5f", color: "#fff", border: "1.5px solid #1e3a5f" },
  newLeadForm: { background: "#fff", borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 },
  vehiculesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 },
  vehiculeCard: { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  vehiculeHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  vehiculeTitle: { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  vehiculeDetails: { display: "flex", gap: 12, marginTop: 10, fontSize: 13, color: "#475569" },
  rapportsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 },
  rapportCard: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  rapportRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  rapportLabel: { width: 90, fontSize: 12, color: "#475569", textTransform: "capitalize" },
  rapportBar: { flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
  rapportBarFill: { height: "100%", background: "#3b82f6", borderRadius: 4, transition: "width 0.5s" },
  rapportCount: { width: 24, fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "right" },
  empty: { padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 14 },
};

export default function Root() {
  return <AuthProvider><App /></AuthProvider>;
}
