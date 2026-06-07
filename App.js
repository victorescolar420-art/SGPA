import { useState, useMemo } from "react";

const DEPARTMENTS = [
  "Patrimônio (SEAPAT)",
  "Compras",
  "Financeiro",
  "Jurídico",
  "Engenharia",
  "Recursos Humanos",
  "Diretoria Administrativa",
  "Secretaria",
  "Protocolo",
  "TI",
];

const DOC_TYPES = [
  "Memorando",
  "Ofício",
  "Termo de Referência",
  "Contrato",
  "Nota Fiscal",
  "Laudo Técnico",
  "Projeto",
  "Inventário",
  "Processo Judicial",
  "Requerimento",
];

const CATEGORIES = [
  "Administrativo",
  "Financeiro",
  "Compras",
  "Patrimonial",
  "Jurídico",
  "Engenharia",
];

const SLA = { Alta: 2, Média: 5, Baixa: 10 };

const STATUS_CONFIG = {
  Recebido: { color: "#3B82F6", bg: "#EFF6FF", label: "Recebido" },
  "Em análise": { color: "#8B5CF6", bg: "#F5F3FF", label: "Em análise" },
  "Em execução": { color: "#F59E0B", bg: "#FFFBEB", label: "Em execução" },
  "Aguardando informação": {
    color: "#EC4899",
    bg: "#FDF2F8",
    label: "Aguard. info",
  },
  Concluído: { color: "#10B981", bg: "#ECFDF5", label: "Concluído" },
  Arquivado: { color: "#6B7280", bg: "#F9FAFB", label: "Arquivado" },
  Vencido: { color: "#EF4444", bg: "#FEF2F2", label: "Vencido" },
};

const PRIORITY_COLOR = {
  Alta: { text: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  Média: { text: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  Baixa: { text: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
};

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysOpen(receivedDate) {
  const now = new Date();
  const received = new Date(receivedDate);
  return Math.floor((now - received) / 86400000);
}

function daysRemaining(deadline) {
  const now = new Date();
  const due = new Date(deadline);
  return Math.ceil((due - now) / 86400000);
}

function calcStatus(proc) {
  if (proc.status === "Concluído" || proc.status === "Arquivado")
    return proc.status;
  const rem = daysRemaining(proc.deadline);
  if (rem < 0 && proc.status !== "Concluído") return "Vencido";
  return proc.status;
}

let counter = 3;
const INITIAL = [
  {
    id: "001/2026",
    docType: "Memorando",
    category: "Administrativo",
    origin: "Diretoria Administrativa",
    subject: "Solicitação de levantamento patrimonial unidade Centro",
    receivedDate: "2026-06-01",
    department: "Patrimônio (SEAPAT)",
    priority: "Alta",
    deadline: "2026-06-03",
    status: "Em execução",
    conclusionDate: "",
    result: "",
    notes: "",
  },
  {
    id: "002/2026",
    docType: "Termo de Referência",
    category: "Compras",
    origin: "SEAPAT",
    subject: "TR para contratação de seguro de equipamentos",
    receivedDate: "2026-06-02",
    department: "Compras",
    priority: "Média",
    deadline: "2026-06-07",
    status: "Recebido",
    conclusionDate: "",
    result: "",
    notes: "",
  },
];

const EMPTY_FORM = {
  docType: "",
  category: "",
  origin: "",
  subject: "",
  receivedDate: today(),
  department: "",
  priority: "Média",
  notes: "",
};

export default function App() {
  const [processes, setProcesses] = useState(INITIAL);
  const [view, setView] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterPrio, setFilterPrio] = useState("Todos");
  const [selected, setSelected] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const enriched = useMemo(
    () => processes.map((p) => ({ ...p, computedStatus: calcStatus(p) })),
    [processes]
  );

  const filtered = useMemo(() => {
    return enriched.filter((p) => {
      const s = calcStatus(p);
      if (filterDept !== "Todos" && p.department !== filterDept) return false;
      if (filterStatus !== "Todos" && s !== filterStatus) return false;
      if (filterPrio !== "Todos" && p.priority !== filterPrio) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.id.toLowerCase().includes(q) ||
          p.subject.toLowerCase().includes(q) ||
          p.origin.toLowerCase().includes(q) ||
          p.docType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, filterDept, filterStatus, filterPrio, search]);

  // KPIs
  const total = enriched.length;
  const concluded = enriched.filter(
    (p) => p.status === "Concluído" || p.status === "Arquivado"
  ).length;
  const overdue = enriched.filter((p) => calcStatus(p) === "Vencido").length;
  const inProgress = enriched.filter(
    (p) =>
      p.status !== "Concluído" &&
      p.status !== "Arquivado" &&
      calcStatus(p) !== "Vencido"
  ).length;
  const efficiency =
    total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

  const byDept = useMemo(() => {
    const map = {};
    enriched.forEach((p) => {
      if (!map[p.department])
        map[p.department] = { total: 0, overdue: 0, done: 0 };
      map[p.department].total++;
      if (calcStatus(p) === "Vencido") map[p.department].overdue++;
      if (p.status === "Concluído") map[p.department].done++;
    });
    return map;
  }, [enriched]);

  function handleSubmit() {
    if (!form.docType || !form.subject || !form.department || !form.origin)
      return;
    counter++;
    const newProc = {
      ...form,
      id: `${String(counter).padStart(3, "0")}/2026`,
      deadline: addDays(form.receivedDate, SLA[form.priority]),
      status: "Recebido",
      conclusionDate: "",
      result: "",
    };
    setProcesses((prev) => [...prev, newProc]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  function updateProcess(id, changes) {
    setProcesses((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...changes } : p))
    );
    if (selected?.id === id) setSelected((s) => ({ ...s, ...changes }));
  }

  const selProc = selected ? enriched.find((p) => p.id === selected.id) : null;

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        background: "#F0F4F8",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #F0F4F8; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        .btn-primary { background: #0D1F3C; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; letter-spacing: .3px; }
        .btn-primary:hover { background: #1a3566; }
        .btn-gold { background: #C9963E; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .btn-gold:hover { background: #b07d2f; }
        .btn-ghost { background: transparent; border: 1.5px solid #CBD5E1; color: #374151; padding: 7px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }
        .btn-ghost:hover { background: #E2E8F0; }
        .nav-item { padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; color: #64748B; transition: all .15s; display:flex; align-items:center; gap:8px; }
        .nav-item.active { background: #0D1F3C; color: #fff; }
        .nav-item:hover:not(.active) { background: #E2E8F0; color: #0D1F3C; }
        input, select, textarea { font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; border: 1.5px solid #CBD5E1; border-radius: 6px; padding: 8px 10px; outline: none; transition: border-color .15s; width: 100%; background: #fff; }
        input:focus, select:focus, textarea:focus { border-color: #0D1F3C; }
        label { font-size: 11.5px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: .5px; display:block; margin-bottom: 4px; }
        .tag { display:inline-flex; align-items:center; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; letter-spacing: .3px; }
        .card { background: #fff; border-radius: 10px; border: 1px solid #E2E8F0; }
        .row-item:hover { background: #F8FAFC; }
        tr:hover td { background: #F8FAFC; }
        .modal-overlay { position:fixed; inset:0; background: rgba(0,0,0,.4); z-index:100; display:flex; align-items:center; justify-content:center; }
        .modal { background:#fff; border-radius:12px; padding:28px; width:540px; max-height:85vh; overflow-y:auto; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
      `}</style>

      {/* HEADER */}
      <div
        style={{
          background: "#0D1F3C",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              background: "#C9963E",
              width: 32,
              height: 32,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontSize: 16 }}>📋</span>
          </div>
          <div>
            <div
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: 0.3,
              }}
            >
              SGPA
            </div>
            <div style={{ color: "#94A3B8", fontSize: 11 }}>
              Sistema de Gestão de Processos Administrativos · SESC/DR-AM
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {overdue > 0 && (
            <div
              className="pulse"
              style={{
                background: "#EF4444",
                color: "#fff",
                padding: "4px 12px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              ⚠ {overdue} vencido{overdue > 1 ? "s" : ""}
            </div>
          )}
          <div
            style={{
              color: "#94A3B8",
              fontSize: 12,
              padding: "4px 12px",
              background: "#1a3566",
              borderRadius: 12,
            }}
          >
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        {/* SIDEBAR */}
        <div
          style={{
            width: 200,
            background: "#fff",
            borderRight: "1px solid #E2E8F0",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {[
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "processes", icon: "📁", label: "Processos" },
            { id: "departments", icon: "🏢", label: "Departamentos" },
            { id: "kpis", icon: "📈", label: "Indicadores" },
          ].map((n) => (
            <div
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => setView(n.id)}
            >
              <span>{n.icon}</span> {n.label}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <button
            className="btn-gold"
            onClick={() => setShowForm(true)}
            style={{ width: "100%", borderRadius: 6, padding: "9px 0" }}
          >
            + Novo Processo
          </button>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0D1F3C" }}>
                  Painel de Controle
                </h2>
                <p style={{ fontSize: 13, color: "#64748B" }}>
                  Visão geral dos processos administrativos em tempo real
                </p>
              </div>

              {/* KPI Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: 14,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "Total de Processos",
                    value: total,
                    icon: "📋",
                    color: "#0D1F3C",
                    bg: "#EEF2FF",
                  },
                  {
                    label: "Em Andamento",
                    value: inProgress,
                    icon: "⏳",
                    color: "#D97706",
                    bg: "#FFFBEB",
                  },
                  {
                    label: "Concluídos",
                    value: concluded,
                    icon: "✅",
                    color: "#059669",
                    bg: "#ECFDF5",
                  },
                  {
                    label: "Vencidos",
                    value: overdue,
                    icon: "🚨",
                    color: "#DC2626",
                    bg: "#FEF2F2",
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="card"
                    style={{ padding: "16px 18px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#64748B",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 6,
                          }}
                        >
                          {k.label}
                        </div>
                        <div
                          style={{
                            fontSize: 30,
                            fontWeight: 700,
                            color: k.color,
                          }}
                        >
                          {k.value}
                        </div>
                      </div>
                      <div
                        style={{
                          background: k.bg,
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        {k.icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Efficiency + Recent */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "260px 1fr",
                  gap: 14,
                  marginBottom: 14,
                }}
              >
                <div className="card" style={{ padding: 20 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 14,
                    }}
                  >
                    Eficiência de Prazo
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color:
                          efficiency >= 95
                            ? "#059669"
                            : efficiency >= 80
                            ? "#D97706"
                            : "#DC2626",
                      }}
                    >
                      {efficiency}%
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        marginBottom: 14,
                      }}
                    >
                      Meta: ≥ 95%
                    </div>
                    <div
                      style={{
                        background: "#F1F5F9",
                        borderRadius: 8,
                        height: 10,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          background: efficiency >= 95 ? "#10B981" : "#F59E0B",
                          height: "100%",
                          width: `${efficiency}%`,
                          borderRadius: 8,
                          transition: "width .5s",
                        }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        label: "Dentro do prazo",
                        value: total - overdue,
                        color: "#059669",
                      },
                      { label: "Vencidos", value: overdue, color: "#DC2626" },
                    ].map((r) => (
                      <div
                        key={r.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ color: "#64748B" }}>{r.label}</span>
                        <span style={{ fontWeight: 700, color: r.color }}>
                          {r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ padding: 20 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#64748B",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginBottom: 14,
                    }}
                  >
                    Processos Recentes
                  </div>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                        {[
                          "Nº",
                          "Assunto",
                          "Departamento",
                          "Prazo",
                          "Status",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: "6px 8px",
                              color: "#64748B",
                              fontWeight: 600,
                              fontSize: 11,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {enriched
                        .slice(-5)
                        .reverse()
                        .map((p) => {
                          const s = calcStatus(p);
                          const sc =
                            STATUS_CONFIG[s] || STATUS_CONFIG["Recebido"];
                          const rem = daysRemaining(p.deadline);
                          return (
                            <tr
                              key={p.id}
                              style={{
                                borderBottom: "1px solid #F1F5F9",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                setSelected(p);
                                setView("processes");
                              }}
                            >
                              <td style={{ padding: "8px 8px" }}>
                                <span
                                  style={{
                                    fontFamily: "IBM Plex Mono",
                                    color: "#0D1F3C",
                                    fontWeight: 600,
                                  }}
                                >
                                  {p.id}
                                </span>
                              </td>
                              <td style={{ padding: "8px 8px", maxWidth: 160 }}>
                                <span
                                  style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "block",
                                  }}
                                >
                                  {p.subject}
                                </span>
                              </td>
                              <td
                                style={{ padding: "8px 8px", color: "#64748B" }}
                              >
                                {p.department}
                              </td>
                              <td style={{ padding: "8px 8px" }}>
                                <span
                                  style={{
                                    color:
                                      rem < 0
                                        ? "#DC2626"
                                        : rem <= 1
                                        ? "#D97706"
                                        : "#059669",
                                    fontWeight: 600,
                                  }}
                                >
                                  {rem < 0
                                    ? `${Math.abs(rem)}d atraso`
                                    : `${rem}d`}
                                </span>
                              </td>
                              <td style={{ padding: "8px 8px" }}>
                                <span
                                  className="tag"
                                  style={{ background: sc.bg, color: sc.color }}
                                >
                                  {sc.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="card" style={{ padding: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748B",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 14,
                  }}
                >
                  Distribuição por Status
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {Object.entries(STATUS_CONFIG).map(([st, sc]) => {
                    const count = enriched.filter(
                      (p) => calcStatus(p) === st
                    ).length;
                    return (
                      <div
                        key={st}
                        style={{
                          background: sc.bg,
                          border: `1.5px solid ${sc.color}30`,
                          borderRadius: 8,
                          padding: "10px 16px",
                          minWidth: 100,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: sc.color,
                          }}
                        >
                          {count}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: sc.color,
                            fontWeight: 600,
                          }}
                        >
                          {sc.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PROCESSES */}
          {view === "processes" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2
                    style={{ fontSize: 20, fontWeight: 700, color: "#0D1F3C" }}
                  >
                    Processos
                  </h2>
                  <p style={{ fontSize: 13, color: "#64748B" }}>
                    {filtered.length} processo{filtered.length !== 1 ? "s" : ""}{" "}
                    encontrado{filtered.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setShowForm(true)}
                >
                  + Novo Processo
                </button>
              </div>

              {/* Filters */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <input
                  placeholder="🔍 Buscar por ID, assunto, origem..."
                  style={{ maxWidth: 280 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  style={{ maxWidth: 200 }}
                >
                  <option value="Todos">Todos os departamentos</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ maxWidth: 160 }}
                >
                  <option value="Todos">Todos os status</option>
                  {Object.keys(STATUS_CONFIG).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={filterPrio}
                  onChange={(e) => setFilterPrio(e.target.value)}
                  style={{ maxWidth: 140 }}
                >
                  <option value="Todos">Todas as prioridades</option>
                  {Object.keys(SLA).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="card" style={{ overflow: "hidden" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#F8FAFC",
                        borderBottom: "2px solid #E2E8F0",
                      }}
                    >
                      {[
                        "Nº Processo",
                        "Tipo / Assunto",
                        "Departamento",
                        "Prioridade",
                        "Recebimento",
                        "Prazo SLA",
                        "Dias Aberto",
                        "Status",
                        "Ações",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            color: "#64748B",
                            fontWeight: 600,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const s = calcStatus(p);
                      const sc = STATUS_CONFIG[s] || STATUS_CONFIG["Recebido"];
                      const pc = PRIORITY_COLOR[p.priority];
                      const rem = daysRemaining(p.deadline);
                      const open = daysOpen(p.receivedDate);
                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: "1px solid #F1F5F9",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelected(p)}
                        >
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                fontFamily: "IBM Plex Mono",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#0D1F3C",
                                background: "#EEF2FF",
                                padding: "2px 8px",
                                borderRadius: 4,
                              }}
                            >
                              {p.id}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", maxWidth: 200 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "#1E293B",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {p.subject}
                            </div>
                            <div style={{ color: "#94A3B8", fontSize: 11 }}>
                              {p.docType} · {p.category}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#374151",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.department}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              className="tag"
                              style={{
                                background: pc.bg,
                                color: pc.text,
                                border: `1px solid ${pc.border}`,
                              }}
                            >
                              {p.priority}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              color: "#64748B",
                              fontSize: 12,
                              fontFamily: "IBM Plex Mono",
                            }}
                          >
                            {new Date(p.receivedDate).toLocaleDateString(
                              "pt-BR"
                            )}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontFamily: "IBM Plex Mono",
                                color:
                                  rem < 0
                                    ? "#DC2626"
                                    : rem <= 1
                                    ? "#D97706"
                                    : "#374151",
                              }}
                            >
                              {new Date(p.deadline).toLocaleDateString("pt-BR")}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color:
                                  rem < 0
                                    ? "#DC2626"
                                    : rem <= 1
                                    ? "#D97706"
                                    : "#94A3B8",
                                fontWeight: rem <= 1 ? 700 : 400,
                              }}
                            >
                              {rem < 0
                                ? `⚠ ${Math.abs(rem)}d vencido`
                                : rem === 0
                                ? "⚡ Vence hoje"
                                : `${rem}d restantes`}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              textAlign: "center",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "IBM Plex Mono",
                                fontSize: 13,
                                fontWeight: 700,
                                color: open > 10 ? "#DC2626" : "#374151",
                              }}
                            >
                              {open}d
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              className="tag"
                              style={{
                                background: sc.bg,
                                color: sc.color,
                                border: `1px solid ${sc.color}30`,
                              }}
                            >
                              {sc.label}
                            </span>
                          </td>
                          <td
                            style={{ padding: "10px 12px" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="btn-ghost"
                                style={{ padding: "4px 10px", fontSize: 11 }}
                                onClick={() => {
                                  setSelected(p);
                                  setEditMode(true);
                                }}
                              >
                                Editar
                              </button>
                              {s !== "Concluído" && (
                                <button
                                  className="btn-primary"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: 11,
                                    background: "#059669",
                                  }}
                                  onClick={() =>
                                    updateProcess(p.id, {
                                      status: "Concluído",
                                      conclusionDate: today(),
                                    })
                                  }
                                >
                                  ✓
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          style={{
                            padding: 40,
                            textAlign: "center",
                            color: "#94A3B8",
                          }}
                        >
                          Nenhum processo encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DEPARTMENTS */}
          {view === "departments" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0D1F3C" }}>
                  Controle por Departamento
                </h2>
                <p style={{ fontSize: 13, color: "#64748B" }}>
                  SLA e cumprimento de prazos por setor
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))",
                  gap: 14,
                }}
              >
                {DEPARTMENTS.map((dept) => {
                  const data = byDept[dept] || {
                    total: 0,
                    overdue: 0,
                    done: 0,
                  };
                  const eff =
                    data.total > 0
                      ? Math.round(
                          ((data.total - data.overdue) / data.total) * 100
                        )
                      : 100;
                  const active = data.total - data.done;
                  return (
                    <div key={dept} className="card" style={{ padding: 18 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#0D1F3C",
                          fontSize: 13,
                          marginBottom: 12,
                        }}
                      >
                        {dept}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 8,
                          marginBottom: 12,
                        }}
                      >
                        {[
                          { l: "Total", v: data.total, c: "#0D1F3C" },
                          { l: "Ativos", v: active, c: "#D97706" },
                          {
                            l: "Vencidos",
                            v: data.overdue,
                            c: data.overdue > 0 ? "#DC2626" : "#059669",
                          },
                        ].map((s) => (
                          <div
                            key={s.l}
                            style={{
                              textAlign: "center",
                              background: "#F8FAFC",
                              borderRadius: 6,
                              padding: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 20,
                                fontWeight: 800,
                                color: s.c,
                              }}
                            >
                              {s.v}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#94A3B8",
                                fontWeight: 600,
                              }}
                            >
                              {s.l}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 11,
                          color: "#64748B",
                          marginBottom: 4,
                        }}
                      >
                        <span>Eficiência de prazo</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              eff >= 95
                                ? "#059669"
                                : eff >= 80
                                ? "#D97706"
                                : "#DC2626",
                          }}
                        >
                          {eff}%
                        </span>
                      </div>
                      <div
                        style={{
                          background: "#F1F5F9",
                          borderRadius: 4,
                          height: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            background:
                              eff >= 95
                                ? "#10B981"
                                : eff >= 80
                                ? "#F59E0B"
                                : "#EF4444",
                            width: `${eff}%`,
                            height: "100%",
                            borderRadius: 4,
                            transition: "width .5s",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {["Alta", "Média", "Baixa"].map((pr) => (
                          <span
                            key={pr}
                            className="tag"
                            style={{
                              background: PRIORITY_COLOR[pr].bg,
                              color: PRIORITY_COLOR[pr].text,
                              border: `1px solid ${PRIORITY_COLOR[pr].border}`,
                              fontSize: 10,
                            }}
                          >
                            SLA {pr}: {SLA[pr]}d
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* KPIS */}
          {view === "kpis" && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0D1F3C" }}>
                  Indicadores de Desempenho (KPIs)
                </h2>
                <p style={{ fontSize: 13, color: "#64748B" }}>
                  Métricas de eficiência operacional
                </p>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                {[
                  {
                    title: "Eficiência de Prazo",
                    value: `${efficiency}%`,
                    meta: "Meta: ≥ 95%",
                    ok: efficiency >= 95,
                    desc: "Processos concluídos dentro do SLA sobre o total.",
                    icon: "🎯",
                  },
                  {
                    title: "Processos Vencidos",
                    value: overdue,
                    meta: "Meta: 0",
                    ok: overdue === 0,
                    desc: "Processos que ultrapassaram o prazo definido pelo SLA.",
                    icon: "⏰",
                  },
                  {
                    title: "Tempo Médio de Atendimento",
                    value:
                      total > 0
                        ? `${Math.round(
                            enriched.reduce(
                              (a, p) => a + daysOpen(p.receivedDate),
                              0
                            ) / total
                          )}d`
                        : "—",
                    meta: "Meta: redução anual de 10%",
                    ok: true,
                    desc: "Média de dias em aberto considerando todos os processos.",
                    icon: "📅",
                  },
                  {
                    title: "Taxa de Conclusão",
                    value:
                      total > 0
                        ? `${Math.round((concluded / total) * 100)}%`
                        : "0%",
                    meta: "Meta: ≥ 80%",
                    ok: total > 0 && concluded / total >= 0.8,
                    desc: "Percentual de processos encerrados sobre o total registrado.",
                    icon: "✅",
                  },
                ].map((k) => (
                  <div key={k.title} className="card" style={{ padding: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#64748B",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 6,
                          }}
                        >
                          {k.title}
                        </div>
                        <div
                          style={{
                            fontSize: 40,
                            fontWeight: 800,
                            color: k.ok ? "#059669" : "#DC2626",
                          }}
                        >
                          {k.value}
                        </div>
                      </div>
                      <div style={{ fontSize: 32 }}>{k.icon}</div>
                    </div>
                    <div
                      style={{
                        background: k.ok ? "#ECFDF5" : "#FEF2F2",
                        border: `1px solid ${k.ok ? "#A7F3D0" : "#FECACA"}`,
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: 12,
                        color: k.ok ? "#059669" : "#DC2626",
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      {k.meta} {k.ok ? "✓" : "✗"}
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        lineHeight: 1.6,
                      }}
                    >
                      {k.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Aging */}
              <div className="card" style={{ padding: 24, marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748B",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 16,
                  }}
                >
                  Aging de Processos (dias em aberto)
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    {
                      label: "Até 30 dias",
                      count: enriched.filter(
                        (p) =>
                          daysOpen(p.receivedDate) <= 30 &&
                          calcStatus(p) !== "Concluído"
                      ).length,
                      color: "#10B981",
                    },
                    {
                      label: "31 a 60 dias",
                      count: enriched.filter(
                        (p) =>
                          daysOpen(p.receivedDate) > 30 &&
                          daysOpen(p.receivedDate) <= 60 &&
                          calcStatus(p) !== "Concluído"
                      ).length,
                      color: "#F59E0B",
                    },
                    {
                      label: "Acima de 60 dias",
                      count: enriched.filter(
                        (p) =>
                          daysOpen(p.receivedDate) > 60 &&
                          calcStatus(p) !== "Concluído"
                      ).length,
                      color: "#EF4444",
                    },
                    { label: "Concluídos", count: concluded, color: "#6B7280" },
                  ].map((b) => (
                    <div
                      key={b.label}
                      style={{
                        flex: 1,
                        background: "#F8FAFC",
                        borderRadius: 8,
                        padding: 16,
                        borderTop: `3px solid ${b.color}`,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 800,
                          color: b.color,
                        }}
                      >
                        {b.count}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#64748B",
                          fontWeight: 600,
                          marginTop: 4,
                        }}
                      >
                        {b.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DETAIL PANEL */}
        {selected && !editMode && (
          <div
            style={{
              width: 340,
              background: "#fff",
              borderLeft: "1px solid #E2E8F0",
              padding: 20,
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontFamily: "IBM Plex Mono",
                  fontWeight: 700,
                  color: "#0D1F3C",
                  background: "#EEF2FF",
                  padding: "3px 10px",
                  borderRadius: 4,
                }}
              >
                {selProc?.id}
              </span>
              <button
                className="btn-ghost"
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            {selProc &&
              (() => {
                const s = calcStatus(selProc);
                const sc = STATUS_CONFIG[s] || STATUS_CONFIG["Recebido"];
                const pc = PRIORITY_COLOR[selProc.priority];
                const rem = daysRemaining(selProc.deadline);
                return (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#1E293B",
                          lineHeight: 1.4,
                          marginBottom: 8,
                        }}
                      >
                        {selProc.subject}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span
                          className="tag"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {s}
                        </span>
                        <span
                          className="tag"
                          style={{ background: pc.bg, color: pc.text }}
                        >
                          Prioridade {selProc.priority}
                        </span>
                      </div>
                    </div>
                    {[
                      ["Tipo de Documento", selProc.docType],
                      ["Categoria", selProc.category],
                      ["Origem", selProc.origin],
                      ["Departamento", selProc.department],
                      [
                        "Recebimento",
                        new Date(selProc.receivedDate).toLocaleDateString(
                          "pt-BR"
                        ),
                      ],
                      [
                        "Prazo SLA",
                        new Date(selProc.deadline).toLocaleDateString("pt-BR"),
                      ],
                      ["SLA (dias)", `${SLA[selProc.priority]} dias úteis`],
                      [
                        "Dias em aberto",
                        `${daysOpen(selProc.receivedDate)} dia(s)`,
                      ],
                      [
                        "Prazo restante",
                        rem < 0
                          ? `⚠ Vencido há ${Math.abs(rem)}d`
                          : rem === 0
                          ? "⚡ Vence hoje"
                          : `${rem} dia(s)`,
                      ],
                    ].map(([l, v]) => (
                      <div
                        key={l}
                        style={{
                          padding: "9px 0",
                          borderBottom: "1px solid #F1F5F9",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#94A3B8",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {l}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#1E293B",
                            marginTop: 2,
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                    {selProc.notes && (
                      <div
                        style={{
                          marginTop: 12,
                          background: "#F8FAFC",
                          borderRadius: 6,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#94A3B8",
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          Observações
                        </div>
                        <div style={{ fontSize: 12, color: "#374151" }}>
                          {selProc.notes}
                        </div>
                      </div>
                    )}
                    {selProc.conclusionDate && (
                      <div
                        style={{
                          marginTop: 12,
                          background: "#ECFDF5",
                          borderRadius: 6,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#059669",
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          Conclusão
                        </div>
                        <div style={{ fontSize: 12, color: "#374151" }}>
                          Data:{" "}
                          {new Date(selProc.conclusionDate).toLocaleDateString(
                            "pt-BR"
                          )}
                          {selProc.result && (
                            <>
                              <br />
                              Resultado: {selProc.result}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#64748B",
                          textTransform: "uppercase",
                          marginBottom: 4,
                        }}
                      >
                        Alterar Status
                      </div>
                      {Object.keys(STATUS_CONFIG)
                        .filter((st) => st !== "Vencido")
                        .map((st) => {
                          const sc2 = STATUS_CONFIG[st];
                          return (
                            <button
                              key={st}
                              onClick={() =>
                                updateProcess(selProc.id, {
                                  status: st,
                                  ...(st === "Concluído"
                                    ? { conclusionDate: today() }
                                    : {}),
                                })
                              }
                              style={{
                                background: s === st ? sc2.bg : "#fff",
                                border: `1.5px solid ${
                                  s === st ? sc2.color : "#E2E8F0"
                                }`,
                                color: s === st ? sc2.color : "#64748B",
                                padding: "7px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: s === st ? 700 : 400,
                                textAlign: "left",
                              }}
                            >
                              {sc2.label}
                            </button>
                          );
                        })}
                    </div>
                  </>
                );
              })()}
          </div>
        )}
      </div>

      {/* NEW PROCESS MODAL */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0D1F3C" }}>
                Registrar Novo Processo
              </h3>
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                O prazo SLA será calculado automaticamente conforme a prioridade
              </p>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              {[
                {
                  key: "docType",
                  label: "Tipo de Documento",
                  type: "select",
                  opts: DOC_TYPES,
                },
                {
                  key: "category",
                  label: "Categoria",
                  type: "select",
                  opts: CATEGORIES,
                },
                {
                  key: "department",
                  label: "Departamento Responsável",
                  type: "select",
                  opts: DEPARTMENTS,
                },
                {
                  key: "priority",
                  label: "Prioridade",
                  type: "select",
                  opts: ["Alta", "Média", "Baixa"],
                },
                { key: "origin", label: "Origem / Remetente", type: "text" },
                {
                  key: "receivedDate",
                  label: "Data de Recebimento",
                  type: "date",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label>{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      value={form[f.key]}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                    >
                      <option value="">Selecione...</option>
                      {f.opts.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type}
                      value={form[f.key]}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label>Assunto / Descrição</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  placeholder="Descreva brevemente o objeto do processo"
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label>Observações Iniciais</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>
            {form.priority && (
              <div
                style={{
                  background: "#EEF2FF",
                  border: "1px solid #C7D2FE",
                  borderRadius: 6,
                  padding: "10px 14px",
                  marginTop: 12,
                  fontSize: 12,
                  color: "#3730A3",
                }}
              >
                📅 Prazo SLA calculado:{" "}
                <strong>
                  {addDays(form.receivedDate || today(), SLA[form.priority])}
                </strong>{" "}
                ({SLA[form.priority]} dias — prioridade {form.priority})
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 20,
                justifyContent: "flex-end",
              }}
            >
              <button className="btn-ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSubmit}>
                Registrar Processo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
