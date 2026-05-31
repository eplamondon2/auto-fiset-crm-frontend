import { useState, useEffect, createContext, useContext, useCallback } from "react";

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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (d.token) {
      localStorage.setItem("crm_token", d.token);
      setToken(d.token); setUser(d.user); return true;
    }
    return false;
  };

  const logout = () => { localStorage.removeItem("crm_token"); setToken(null); setUser(null); };

  const api = useCallback(async (path, opts = {}) => {
    const r = await fetch(`${API}${path}`, {
      ...opts, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts.headers }
    });
    return r.json();
  }, [token]);

  return <AuthContext.Provider value={{ user, token, login, logout, api }}>{children}</AuthContext.Provider>;
}

// ── Modal Prochaine Étape ─────────────────────────────────
function ModalProchaineEtape({ leadId, clientNom, onClose, onSaved }) {
  const { api, user } = useAuth();
  const [type, setType] = useState("telephone");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const types = [
    { id: "telephone", icon: "📞", label: "Appel" },
    { id: "texto", icon: "💬", label: "Texto" },
    { id: "courriel", icon: "📧", label: "Courriel" },
    { id: "rendezvous", icon: "🤝", label: "Rendez-vous" },
    { id: "livraison", icon: "🚗", label: "Livraison" },
  ];

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    await api("/api/taches", {
      method: "POST",
      body: JSON.stringify({
        lead_id: leadId,
        type,
        date_heure: new Date(`${date}T${heure}`).toISOString(),
        notes
      })
    });
    setSaving(false);
    onSaved && onSaved();
    onClose();
  };

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 420 }}>
        <div style={s.modalHeader}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>📋 Prochaine étape</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{clientNom}</div>
          </div>
          <button style={s.btnClose} onClick={onClose}>✕</button>
        </div>
        <div style={s.modalBody}>
          <div style={s.field}>
            <label style={s.label}>Type de suivi</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {types.map(t => (
                <div key={t.id}
                  style={{ ...s.typeChip, ...(type === t.id ? s.typeChipActive : {}) }}
                  onClick={() => setType(t.id)}>
                  {t.icon} {t.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={s.field}>
              <label style={s.label}>Date</label>
              <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Heure</label>
              <input style={s.input} type="time" value={heure} onChange={e => setHeure(e.target.value)} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Notes (optionnel)</label>
            <input style={s.input} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Ex: rappeler pour essai routier" />
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", background: "#f8fafc", padding: "8px 12px", borderRadius: 8 }}>
            📱 Un SMS sera envoyé au conseiller pour confirmer la tâche
          </div>
        </div>
        <div style={s.modalFooter}>
          <button style={s.btnSkip} onClick={onClose}>Passer pour l'instant</button>
          <button style={s.btnPrimary} onClick={handleSave} disabled={!date || saving}>
            {saving ? "Ajout..." : "Ajouter au calendrier"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Invalide / Perdu ────────────────────────────────
function ModalStatutSpecial({ lead, statut, onClose, onSaved }) {
  const { api } = useAuth();
  const [raison, setRaison] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!raison.trim()) return;
    setSaving(true);
    await api(`/api/leads/${lead.id}`, {
      method: "PATCH",
      body: JSON.stringify({ statut, raison_perte: raison })
    });
    setSaving(false);
    onSaved && onSaved();
    onClose();
  };

  const isInvalide = statut === "invalide";
  const color = isInvalide ? "#f59e0b" : "#ef4444";
  const icon = isInvalide ? "⚠️" : "❌";

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, maxWidth: 400 }}>
        <div style={{ ...s.modalHeader, borderBottom: `3px solid ${color}` }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{icon} Marquer comme {statut}</div>
          <button style={s.btnClose} onClick={onClose}>✕</button>
        </div>
        <div style={s.modalBody}>
          <div style={{ fontSize: 14, color: "#475569", marginBottom: 16 }}>
            Client: <strong>{lead.client_nom || "Inconnu"}</strong>
          </div>
          <div style={s.field}>
            <label style={s.label}>Raison obligatoire *</label>
            <textarea style={{ ...s.input, height: 100, resize: "vertical" }}
              value={raison} onChange={e => setRaison(e.target.value)}
              placeholder={isInvalide ? "Ex: Mauvais numéro, doublon..." : "Ex: A acheté ailleurs, hors budget..."} />
          </div>
        </div>
        <div style={s.modalFooter}>
          <button style={s.btnSecondary} onClick={onClose}>Annuler</button>
          <button style={{ ...s.btnPrimary, background: color }} onClick={handleSave} disabled={!raison.trim() || saving}>
            {saving ? "Sauvegarde..." : `Confirmer — ${statut}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lead Modal complet ────────────────────────────────────
function LeadModal({ lead, onClose, onUpdate }) {
  const { api, user } = useAuth();
  const [statut, setStatut] = useState(lead.statut);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);
  const [showEtape, setShowEtape] = useState(false);
  const [showStatutSpecial, setShowStatutSpecial] = useState(null); // 'invalide' | 'perdu'
  const [taches, setTaches] = useState([]);
  const isDir = user?.role === "directeur";

  useEffect(() => {
    api(`/api/taches?lead_id=${lead.id}`).then(d => Array.isArray(d) && setTaches(d));
  }, []);

  const save = async () => {
    setSaving(true);
    const updated = await api(`/api/leads/${lead.id}`, {
      method: "PATCH", body: JSON.stringify({ statut, notes })
    });
    setSaving(false);
    onUpdate(updated);
    setShowEtape(true); // demander prochaine étape après sauvegarde
  };

  const completeTache = async (tacheId) => {
    await api(`/api/taches/${tacheId}`, { method: "PATCH", body: JSON.stringify({ statut: "complete" }) });
    setTaches(prev => prev.map(t => t.id === tacheId ? { ...t, statut: "complete" } : t));
  };

  const statuts = ["nouveau", "contacté", "test_drive", "offre", "vendu"];
  const statutColor = { nouveau: "#3b82f6", contacté: "#8b5cf6", test_drive: "#f59e0b", offre: "#f97316", vendu: "#22c55e", perdu: "#ef4444", invalide: "#f59e0b" };
  const typeIcon = { telephone: "📞", texto: "💬", courriel: "📧", rendezvous: "🤝", livraison: "🚗" };

  return (
    <>
      <div style={s.overlay}>
        <div style={{ ...s.modal, maxWidth: 560 }}>
          <div style={s.modalHeader}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>{lead.client_nom || "Client inconnu"}</h2>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                {lead.source} · {lead.client_telephone || "Pas de téléphone"}
              </div>
            </div>
            <button style={s.btnClose} onClick={onClose}>✕</button>
          </div>
          <div style={s.modalBody}>
            {/* Infos */}
            <div style={s.infoGrid}>
              <InfoItem label="Téléphone" value={lead.client_telephone} />
              <InfoItem label="Source" value={lead.source} />
              <InfoItem label="Conseiller" value={lead.conseiller_nom} />
              <InfoItem label="Véhicule" value={lead.annee ? `${lead.annee} ${lead.marque} ${lead.modele}` : "—"} />
              <InfoItem label="Budget" value={lead.budget ? `${Number(lead.budget).toLocaleString("fr-CA")} $` : "—"} />
              <InfoItem label="Échange" value={lead.vehicule_echange || "—"} />
              {lead.raison_perte && <InfoItem label="Raison" value={lead.raison_perte} />}
            </div>

            {/* Pipeline */}
            <div style={s.field}>
              <label style={s.label}>Pipeline</label>
              <div style={s.pipeline}>
                {statuts.map(st => (
                  <div key={st}
                    style={{ ...s.pipelineStep, ...(statut === st ? { background: statutColor[st], color: "#fff", border: `1.5px solid ${statutColor[st]}` } : {}) }}
                    onClick={() => setStatut(st)}>{st}</div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={s.field}>
              <label style={s.label}>Notes</label>
              <textarea style={{ ...s.input, height: 70, resize: "vertical" }}
                value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes sur ce lead..." />
            </div>

            {/* Tâches */}
            {taches.length > 0 && (
              <div style={s.field}>
                <label style={s.label}>Tâches planifiées</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {taches.map(t => (
                    <div key={t.id} style={{ ...s.tacheRow, opacity: t.statut === "complete" ? 0.5 : 1 }}>
                      <span>{typeIcon[t.type]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t.type}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {new Date(t.date_heure).toLocaleString("fr-CA", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      {t.statut === "a_faire" && (
                        <button style={s.btnComplete} onClick={() => completeTache(t.id)}>✓ Fait</button>
                      )}
                      {t.statut === "complete" && <span style={{ fontSize: 11, color: "#22c55e" }}>✓ Complété</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button style={s.btnAddEtape} onClick={() => setShowEtape(true)}>
              + Ajouter une tâche de suivi
            </button>
          </div>

          <div style={s.modalFooter}>
            {/* Boutons directeur */}
            {isDir && (
              <div style={{ display: "flex", gap: 8, marginRight: "auto" }}>
                <button style={{ ...s.btnDanger2, borderColor: "#f59e0b", color: "#f59e0b" }}
                  onClick={() => setShowStatutSpecial("invalide")}>⚠️ Invalide</button>
                <button style={{ ...s.btnDanger2, borderColor: "#ef4444", color: "#ef4444" }}
                  onClick={() => setShowStatutSpecial("perdu")}>❌ Perdu</button>
              </div>
            )}
            <button style={s.btnSecondary} onClick={onClose}>Fermer</button>
            <button style={s.btnPrimary} onClick={save} disabled={saving}>
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>

      {showEtape && (
        <ModalProchaineEtape
          leadId={lead.id}
          clientNom={lead.client_nom}
          onClose={() => setShowEtape(false)}
          onSaved={() => api(`/api/taches`).then(d => Array.isArray(d) && setTaches(d.filter(t => t.lead_id === lead.id)))}
        />
      )}

      {showStatutSpecial && (
        <ModalStatutSpecial
          lead={lead}
          statut={showStatutSpecial}
          onClose={() => setShowStatutSpecial(null)}
          onSaved={() => { onUpdate({ ...lead, statut: showStatutSpecial }); onClose(); }}
        />
      )}
    </>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={s.infoItem}>
      <div style={s.infoLabel}>{label}</div>
      <div style={s.infoValue}>{value || "—"}</div>
    </div>
  );
}

// ── Calendrier hebdomadaire ───────────────────────────────
function CalendrierPage() {
  const { api } = useAuth();
  const [taches, setTaches] = useState([]);
  const [semaine, setSemaine] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // lundi
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    api(`/api/taches?semaine=${semaine}`).then(d => Array.isArray(d) && setTaches(d));
  }, [semaine]);

  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semaine);
    d.setDate(d.getDate() + i);
    return d;
  });

  const jourLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const typeIcon = { telephone: "📞", texto: "💬", courriel: "📧", rendezvous: "🤝", livraison: "🚗" };
  const typeColor = { telephone: "#3b82f6", texto: "#8b5cf6", courriel: "#06b6d4", rendezvous: "#f59e0b", livraison: "#22c55e" };

  const tachesJour = (jour) => taches.filter(t => {
    const d = new Date(t.date_heure);
    return d.toDateString() === jour.toDateString();
  });

  const semainePrecedente = () => {
    const d = new Date(semaine);
    d.setDate(d.getDate() - 7);
    setSemaine(d.toISOString().split("T")[0]);
  };

  const semaineSuivante = () => {
    const d = new Date(semaine);
    d.setDate(d.getDate() + 7);
    setSemaine(d.toISOString().split("T")[0]);
  };

  const completeTache = async (id) => {
    await api(`/api/taches/${id}`, { method: "PATCH", body: JSON.stringify({ statut: "complete" }) });
    setTaches(prev => prev.map(t => t.id === id ? { ...t, statut: "complete" } : t));
  };

  const debutSemaine = new Date(semaine).toLocaleDateString("fr-CA", { month: "long", day: "numeric" });
  const finSemaine = jours[6].toLocaleDateString("fr-CA", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>📅 Calendrier</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={s.btnNav} onClick={semainePrecedente}>‹</button>
          <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{debutSemaine} — {finSemaine}</span>
          <button style={s.btnNav} onClick={semaineSuivante}>›</button>
        </div>
      </div>

      <div style={s.calGrid}>
        {jours.map((jour, i) => {
          const isToday = jour.toDateString() === new Date().toDateString();
          const tachesJ = tachesJour(jour);
          return (
            <div key={i} style={{ ...s.calCol, ...(isToday ? s.calColToday : {}) }}>
              <div style={s.calHeader}>
                <div style={{ ...s.calJour, ...(isToday ? s.calJourToday : {}) }}>{jourLabels[i]}</div>
                <div style={{ ...s.calDate, ...(isToday ? s.calDateToday : {}) }}>
                  {jour.getDate()}
                </div>
              </div>
              <div style={s.calBody}>
                {tachesJ.length === 0 ? (
                  <div style={s.calVide}>—</div>
                ) : tachesJ.map(t => (
                  <div key={t.id} style={{ ...s.calTache, borderLeft: `3px solid ${typeColor[t.type]}`, opacity: t.statut === "complete" ? 0.5 : 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: typeColor[t.type] }}>
                      {typeIcon[t.type]} {new Date(t.date_heure).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", marginTop: 2 }}>
                      {t.client_nom || "Client inconnu"}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.conseiller_nom}</div>
                    {t.notes && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontStyle: "italic" }}>{t.notes}</div>}
                    {t.statut === "a_faire" && (
                      <button style={s.btnCompleteMini} onClick={() => completeTache(t.id)}>✓ Fait</button>
                    )}
                    {t.statut === "complete" && <div style={{ fontSize: 10, color: "#22c55e", marginTop: 4 }}>✓ Complété</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {Object.entries(typeColor).map(([type, color]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            {typeIcon[type]} {type}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── New Lead Form avec prochaine étape ────────────────────
function NewLeadForm({ source, onSaved }) {
  const { api } = useAuth();
  const [form, setForm] = useState({ nom: "", telephone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [newLead, setNewLead] = useState(null); // pour déclencher modal étape

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const client = await api("/api/clients", {
      method: "POST",
      body: JSON.stringify({ nom: form.nom, telephone: form.telephone, email: form.email, source })
    });
    const clientId = client.existing ? client.client.id : client.id;
    const lead = await api("/api/leads", {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId, source, notes: form.notes,
        heure_arrivee: source === "walk-in" ? new Date().toISOString() : undefined
      })
    });
    setSaving(false);
    setForm({ nom: "", telephone: "", email: "", notes: "" });
    setNewLead({ ...lead, client_nom: form.nom }); // ouvre modal étape
  };

  return (
    <>
      <form onSubmit={submit} style={s.newLeadForm}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#1e293b", fontWeight: 700 }}>+ Nouveau lead</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={s.field}>
            <label style={s.label}>Nom complet *</label>
            <input style={s.input} value={form.nom} onChange={e => set("nom", e.target.value)} required placeholder="Jean Tremblay" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Téléphone</label>
            <input style={s.input} value={form.telephone} onChange={e => set("telephone", e.target.value)} placeholder="418-000-0000" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Courriel</label>
            <input style={s.input} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="jean@exemple.com" />
          </div>
          <div style={s.field}>
            <label style={s.label}>Notes</label>
            <input style={s.input} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Intéressé par..." />
          </div>
        </div>
        <button style={s.btnPrimary} type="submit" disabled={saving}>
          {saving ? "Création..." : "Créer le lead"}
        </button>
      </form>

      {newLead && (
        <ModalProchaineEtape
          leadId={newLead.id}
          clientNom={newLead.client_nom}
          onClose={() => { setNewLead(null); onSaved && onSaved(); }}
          onSaved={() => onSaved && onSaved()}
        />
      )}
    </>
  );
}

// ── Leads List ────────────────────────────────────────────
function LeadsList({ source, title, icon }) {
  const { api } = useAuth();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [filtre, setFiltre] = useState("actifs");

  const load = useCallback(() => {
    api("/api/leads").then(d => {
      if (Array.isArray(d)) setLeads(source ? d.filter(l => l.source === source) : d);
    });
  }, [source]);

  useEffect(() => { load(); }, [load]);

  const leadsFiltrés = leads.filter(l => {
    const matchSearch = (l.client_nom || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.client_telephone || "").includes(search);
    const matchFiltre = filtre === "tous" ? true :
      filtre === "actifs" ? !["vendu", "perdu", "invalide"].includes(l.statut) :
      l.statut === filtre;
    return matchSearch && matchFiltre;
  });

  const statutColor = { nouveau: "#3b82f6", contacté: "#8b5cf6", test_drive: "#f59e0b", offre: "#f97316", vendu: "#22c55e", perdu: "#ef4444", invalide: "#f59e0b" };
  const sourceIcon = { "walk-in": "🚶", "phone-up": "📞", facebook: "📘", web: "🌐", kijiji: "🏷️" };

  const filtres = ["actifs", "nouveau", "contacté", "test_drive", "offre", "vendu", "perdu", "invalide", "tous"];

  return (
    <div>
      {title && <h2 style={{ ...s.pageTitle, fontSize: 18, margin: "20px 0 12px" }}>{icon} {title}</h2>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {filtres.map(f => (
          <div key={f} style={{ ...s.filtreChip, ...(filtre === f ? s.filtreChipActive : {}) }}
            onClick={() => setFiltre(f)}>{f}</div>
        ))}
      </div>
      <input style={s.search} placeholder="Rechercher nom ou téléphone..."
        value={search} onChange={e => setSearch(e.target.value)} />
      <div style={s.table}>
        {leadsFiltrés.length === 0 ? <p style={s.empty}>Aucun lead trouvé</p> :
          leadsFiltrés.map(l => (
            <div key={l.id} style={{ ...s.tableRow, cursor: "pointer" }} onClick={() => setSelected(l)}>
              <div style={{ fontSize: 20 }}>{sourceIcon[l.source] || "👤"}</div>
              <div style={{ flex: 1, marginLeft: 12 }}>
                <div style={s.rowName}>{l.client_nom || "Client inconnu"}</div>
                <div style={s.rowSub}>{l.client_telephone || "—"} · {l.conseiller_nom || "Non assigné"}</div>
                {l.annee && <div style={s.rowSub}>{l.annee} {l.marque} {l.modele}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ ...s.badge, background: (statutColor[l.statut] || "#94a3b8") + "22", color: statutColor[l.statut] || "#94a3b8" }}>
                  {l.statut}
                </div>
                <div style={{ ...s.rowSub, marginTop: 4 }}>{new Date(l.created_at).toLocaleDateString("fr-CA")}</div>
              </div>
            </div>
          ))}
      </div>
      {selected && (
        <LeadModal lead={selected} onClose={() => setSelected(null)}
          onUpdate={updated => { load(); setSelected(null); }} />
      )}
    </div>
  );
}

// ── Pages ─────────────────────────────────────────────────
function Dashboard() {
  const { api, user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [taches, setTaches] = useState([]);

  useEffect(() => {
    api("/api/leads").then(d => Array.isArray(d) && setLeads(d));
    const lundi = new Date();
    lundi.setDate(lundi.getDate() - lundi.getDay() + 1);
    api(`/api/taches?semaine=${lundi.toISOString().split("T")[0]}`).then(d => Array.isArray(d) && setTaches(d));
  }, []);

  const stats = [
    { label: "Leads actifs", value: leads.filter(l => !["vendu","perdu","invalide"].includes(l.statut)).length, icon: "👥", color: "#3b82f6" },
    { label: "Nouveaux", value: leads.filter(l => l.statut === "nouveau").length, icon: "🆕", color: "#8b5cf6" },
    { label: "Test drive", value: leads.filter(l => l.statut === "test_drive").length, icon: "🔑", color: "#f59e0b" },
    { label: "Tâches aujourd'hui", value: taches.filter(t => new Date(t.date_heure).toDateString() === new Date().toDateString() && t.statut === "a_faire").length, icon: "📋", color: "#ef4444" },
  ];

  const tachesAujourdhui = taches.filter(t =>
    new Date(t.date_heure).toDateString() === new Date().toDateString() && t.statut === "a_faire"
  );

  const typeIcon = { telephone: "📞", texto: "💬", courriel: "📧", rendezvous: "🤝", livraison: "🚗" };

  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>Bonjour, {user?.nom?.split(" ")[0]} 👋</h1>
      <div style={s.statsGrid}>
        {stats.map(st => (
          <div key={st.label} style={{ ...s.statCard, borderTop: `3px solid ${st.color}` }}>
            <div style={{ fontSize: 26 }}>{st.icon}</div>
            <div style={{ ...s.statValue, color: st.color }}>{st.value}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>
      {tachesAujourdhui.length > 0 && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>📋 Tâches aujourd'hui</h2>
          <div style={s.table}>
            {tachesAujourdhui.map(t => (
              <div key={t.id} style={s.tableRow}>
                <span style={{ fontSize: 18 }}>{typeIcon[t.type]}</span>
                <div style={{ flex: 1, marginLeft: 12 }}>
                  <div style={s.rowName}>{t.client_nom || "Client inconnu"}</div>
                  <div style={s.rowSub}>{new Date(t.date_heure).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })} · {t.conseiller_nom}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Leads récents</h2>
        <div style={s.table}>
          {leads.slice(0, 5).map(l => (
            <div key={l.id} style={s.tableRow}>
              <div style={{ flex: 1 }}>
                <div style={s.rowName}>{l.client_nom || "Inconnu"}</div>
                <div style={s.rowSub}>{l.source} · {l.conseiller_nom || "Non assigné"}</div>
              </div>
              <div style={{ ...s.badge, background: "#3b82f622", color: "#3b82f6" }}>{l.statut}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WalkInPage() {
  const [ref, setRef] = useState(0);
  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>🚶 Walk-in</h1>
      <NewLeadForm source="walk-in" onSaved={() => setRef(r => r + 1)} />
      <LeadsList source="walk-in" key={ref} />
    </div>
  );
}

function PhoneUpPage() {
  const [ref, setRef] = useState(0);
  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>📞 Phone-Up</h1>
      <NewLeadForm source="phone-up" onSaved={() => setRef(r => r + 1)} />
      <LeadsList source="phone-up" key={ref} />
    </div>
  );
}

function VehiculesPage() {
  const { api } = useAuth();
  const [vehicules, setVehicules] = useState([]);
  useEffect(() => { api("/api/vehicules").then(d => Array.isArray(d) && setVehicules(d)); }, []);
  const statutColor = { disponible: "#22c55e", vendu: "#ef4444", reserve: "#f59e0b", archivé: "#6b7280" };
  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>🚗 Inventaire</h1>
      <div style={s.vehiculesGrid}>
        {vehicules.map(v => (
          <div key={v.id} style={s.vehiculeCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{v.annee} {v.marque} {v.modele}</div>
              <div style={{ ...s.badge, background: (statutColor[v.statut] || "#94a3b8") + "22", color: statutColor[v.statut] || "#94a3b8" }}>{v.statut}</div>
            </div>
            {v.trim && <div style={s.rowSub}>{v.trim}</div>}
            <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 13, color: "#475569" }}>
              <span>💰 {v.prix ? Number(v.prix).toLocaleString("fr-CA") + " $" : "—"}</span>
              <span>📍 {v.kilometrage ? Number(v.kilometrage).toLocaleString("fr-CA") + " km" : "—"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RapportsPage() {
  const { api } = useAuth();
  const [leads, setLeads] = useState([]);
  useEffect(() => { api("/api/leads").then(d => Array.isArray(d) && setLeads(d)); }, []);
  const bySource = ["walk-in","phone-up","facebook","web","kijiji"].map(s => ({ source: s, count: leads.filter(l => l.source === s).length }));
  const byStatut = ["nouveau","contacté","test_drive","offre","vendu","perdu","invalide"].map(s => ({ statut: s, count: leads.filter(l => l.statut === s).length }));
  const max = Math.max(...bySource.map(s => s.count), 1);
  return (
    <div style={s.page}>
      <h1 style={s.pageTitle}>📈 Rapports</h1>
      <div style={s.rapportsGrid}>
        <div style={s.rapportCard}>
          <h3 style={s.sectionTitle}>Leads par source</h3>
          {bySource.map(s2 => (
            <div key={s2.source} style={s.rapportRow}>
              <span style={s.rapportLabel}>{s2.source}</span>
              <div style={s.rapportBar}><div style={{ ...s.rapportBarFill, width: `${(s2.count / max) * 100}%` }} /></div>
              <span style={s.rapportCount}>{s2.count}</span>
            </div>
          ))}
        </div>
        <div style={s.rapportCard}>
          <h3 style={s.sectionTitle}>Pipeline</h3>
          {byStatut.map(s2 => (
            <div key={s2.statut} style={s.rapportRow}>
              <span style={s.rapportLabel}>{s2.statut}</span>
              <div style={s.rapportBar}><div style={{ ...s.rapportBarFill, width: `${(s2.count / max) * 100}%`, background: "#8b5cf6" }} /></div>
              <span style={s.rapportCount}>{s2.count}</span>
            </div>
          ))}
        </div>
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
    { id: "calendrier", icon: "📅", label: "Calendrier" },
    { id: "leads", icon: "👥", label: "Tous les leads" },
    { id: "walkin", icon: "🚶", label: "Walk-in" },
    { id: "phoneup", icon: "📞", label: "Phone-Up" },
    { id: "webleads", icon: "🌐", label: "Leads Web" },
    { id: "vehicules", icon: "🚗", label: "Véhicules" },
    ...(isDir ? [{ id: "rapports", icon: "📈", label: "Rapports" }] : []),
  ];
  return (
    <>
      {mobileOpen && <div style={s.overlayBg} onClick={() => setMobileOpen(false)} />}
      <div style={{ ...s.sidebar, transform: mobileOpen ? "translateX(0)" : undefined }}>
        <div style={s.sideHeader}>
          <span style={{ fontSize: 22 }}>🚗</span>
          <div>
            <div style={s.sideTitle}>AUTO FISET</div>
            <div style={s.sideRole}>{user?.nom} · {user?.role}</div>
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: "auto" }}>
          {navItems.map(item => (
            <div key={item.id}
              style={{ ...s.navItem, ...(page === item.id ? s.navActive : {}) }}
              onClick={() => { setPage(item.id); setMobileOpen(false); }}>
              <span>{item.icon}</span><span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div style={s.navItem} onClick={logout}><span>🚪</span><span>Déconnexion</span></div>
      </div>
    </>
  );
}

// ── Login ─────────────────────────────────────────────────
function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    const ok = await login(email, password);
    if (!ok) setError("Courriel ou mot de passe invalide");
    setLoading(false);
  };
  return (
    <div style={s.loginBg}>
      <div style={s.loginCard}>
        <div style={s.loginLogo}>
          <span style={{ fontSize: 40 }}>🚗</span>
          <div>
            <div style={s.logoTitle}>AUTO FISET</div>
            <div style={s.logoSub}>Système CRM</div>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={s.field}><label style={s.label}>Courriel</label>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="prenom@autofiset.com" /></div>
          <div style={s.field}><label style={s.label}>Mot de passe</label>
            <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" /></div>
          {error && <div style={s.error}>{error}</div>}
          <button style={s.btnPrimary} type="submit" disabled={loading}>{loading ? "Connexion..." : "Se connecter"}</button>
        </form>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────
function App() {
  const { user } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return <LoginPage />;
  const pages = {
    dashboard: <Dashboard />,
    calendrier: <CalendrierPage />,
    leads: <div style={s.page}><h1 style={s.pageTitle}>👥 Tous les leads</h1><LeadsList /></div>,
    walkin: <WalkInPage />,
    phoneup: <PhoneUpPage />,
    webleads: <div style={s.page}><h1 style={s.pageTitle}>🌐 Leads Web</h1><LeadsList source={null} /></div>,
    vehicules: <VehiculesPage />,
    rapports: <RapportsPage />,
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={s.topbar}>
          <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }} onClick={() => setMobileOpen(true)}>☰</button>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>Auto Fiset CRM</div>
        </div>
        <div style={{ flex: 1 }}>{pages[page]}</div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const s = {
  loginBg: { minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  loginCard: { background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400, boxShadow: "0 25px 50px rgba(0,0,0,0.3)" },
  loginLogo: { display: "flex", alignItems: "center", gap: 14, marginBottom: 32 },
  logoTitle: { fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: 2 },
  logoSub: { fontSize: 12, color: "#64748b", letterSpacing: 1 },
  sidebar: { width: 240, background: "#0f172a", color: "#fff", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 100, transition: "transform 0.3s" },
  sideHeader: { padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: 10 },
  sideTitle: { fontSize: 14, fontWeight: 800, letterSpacing: 2 },
  sideRole: { fontSize: 11, color: "#94a3b8" },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", fontSize: 14, color: "#94a3b8" },
  navActive: { background: "rgba(59,130,246,0.2)", color: "#fff", borderRight: "3px solid #3b82f6" },
  overlayBg: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 },
  topbar: { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 },
  page: { padding: "24px 20px", maxWidth: 960, margin: "0 auto" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 20px" },
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
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize", whiteSpace: "nowrap" },
  search: { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box" },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, color: "#1e293b", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  error: { background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 },
  btnPrimary: { padding: "11px 20px", background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "11px 20px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnSkip: { padding: "11px 16px", background: "none", color: "#94a3b8", border: "none", fontSize: 13, cursor: "pointer" },
  btnClose: { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" },
  btnDanger2: { padding: "8px 14px", background: "none", border: "1.5px solid", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btnAddEtape: { width: "100%", padding: "10px", background: "#f0f9ff", color: "#0284c7", border: "1.5px dashed #7dd3fc", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4 },
  btnComplete: { padding: "4px 10px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 },
  btnCompleteMini: { marginTop: 6, padding: "3px 8px", background: "#f0fdf4", color: "#16a34a", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, cursor: "pointer" },
  btnNav: { padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: 16, cursor: "pointer", color: "#475569" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxHeight: "90vh", overflow: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #e2e8f0" },
  modalBody: { padding: "18px 24px" },
  modalFooter: { display: "flex", gap: 10, alignItems: "center", padding: "14px 24px", borderTop: "1px solid #e2e8f0" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 },
  infoItem: { background: "#f8fafc", borderRadius: 8, padding: "9px 12px" },
  infoLabel: { fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 3 },
  infoValue: { fontSize: 13, color: "#1e293b", fontWeight: 500 },
  pipeline: { display: "flex", gap: 6, flexWrap: "wrap" },
  pipelineStep: { padding: "6px 12px", borderRadius: 20, border: "1.5px solid #e2e8f0", fontSize: 12, cursor: "pointer", color: "#64748b" },
  tacheRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#f8fafc", borderRadius: 8, marginBottom: 6 },
  typeChip: { padding: "7px 12px", borderRadius: 20, border: "1.5px solid #e2e8f0", fontSize: 12, cursor: "pointer", color: "#475569" },
  typeChipActive: { background: "#1e3a5f", color: "#fff", border: "1.5px solid #1e3a5f" },
  filtreChip: { padding: "5px 12px", borderRadius: 20, border: "1.5px solid #e2e8f0", fontSize: 11, cursor: "pointer", color: "#64748b", fontWeight: 500 },
  filtreChipActive: { background: "#1e3a5f", color: "#fff", border: "1.5px solid #1e3a5f" },
  newLeadForm: { background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  vehiculesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  vehiculeCard: { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  rapportsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 },
  rapportCard: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  rapportRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  rapportLabel: { width: 90, fontSize: 12, color: "#475569", textTransform: "capitalize" },
  rapportBar: { flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" },
  rapportBarFill: { height: "100%", background: "#3b82f6", borderRadius: 4 },
  rapportCount: { width: 24, fontSize: 13, fontWeight: 700, color: "#1e293b", textAlign: "right" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 },
  calCol: { background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", minHeight: 120 },
  calColToday: { boxShadow: "0 0 0 2px #3b82f6" },
  calHeader: { padding: "8px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "center" },
  calJour: { fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  calJourToday: { color: "#3b82f6" },
  calDate: { fontSize: 18, fontWeight: 800, color: "#1e293b", marginTop: 2 },
  calDateToday: { color: "#3b82f6" },
  calBody: { padding: 6 },
  calVide: { fontSize: 11, color: "#e2e8f0", textAlign: "center", padding: "8px 0" },
  calTache: { background: "#f8fafc", borderRadius: 6, padding: "6px 8px", marginBottom: 4 },
  empty: { padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 14 },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
};

export default function Root() {
  return <AuthProvider><App /></AuthProvider>;
}
