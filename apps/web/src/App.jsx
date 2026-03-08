import React, { useEffect, useMemo, useState } from "react";

const envApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim();
const defaultApiBase = envApiBase || "http://localhost:4010";

async function apiRequest({ baseUrl, path, method = "GET", token, body }) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const baseTabs = [
  ["cases", "Cases"],
  ["overview", "Overview"],
  ["timeline", "Timeline"],
  ["calendar", "Calendar"],
  ["tasks", "Tasks"],
  ["messages", "Messages"],
  ["documents", "Documents"],
  ["invites", "Invites"],
];

const parentTabs = [
  ["parent_home", "Home"],
  ["messages", "Messages"],
  ["calendar", "Calendar"],
  ["documents", "Documents"],
  ["tasks", "Tasks"],
  ["timeline", "Timeline"],
  ["cases", "Cases"],
];

const DOC_CATEGORY_META = {
  all: { label: "All", icon: "🗂️" },
  school: { label: "School", icon: "🏫" },
  medical: { label: "Medical", icon: "🩺" },
  court: { label: "Court", icon: "⚖️" },
  visits: { label: "Visits", icon: "🤝" },
  general: { label: "General", icon: "📄" },
};

const ROLE_LABELS = {
  admin: "Admin",
  case_worker: "Case Worker",
  foster_parent: "Foster Parent",
  biological_parent: "Biological Parent",
  gal: "GAL / CASA",
};

const roleLabel = (role) => ROLE_LABELS[role] || role;

export default function App() {
  const [apiBase, setApiBase] = useState(() => localStorage.getItem("cc_api_base") || defaultApiBase);
  const [email, setEmail] = useState("worker@carecircle.dev");
  const [code, setCode] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("cc_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("cc_user");
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });

  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [invites, setInvites] = useState([]);

  const [tab, setTab] = useState("cases");
  const [compose, setCompose] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("biological_parent");
  const [docName, setDocName] = useState("");
  const [docVisibility, setDocVisibility] = useState("all");
  const [docCategory, setDocCategory] = useState("general");
  const [docFilterCategory, setDocFilterCategory] = useState("all");
  const [docFile, setDocFile] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [calendarScope, setCalendarScope] = useState("current");
  const [allCalendarEvents, setAllCalendarEvents] = useState([]);
  const [selectedDayKey, setSelectedDayKey] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [caseSearch, setCaseSearch] = useState("");
  const [managerCases, setManagerCases] = useState([]);
  const [managerWorkers, setManagerWorkers] = useState([]);
  const [managerUsers, setManagerUsers] = useState([]);

  const selectedCase = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);
  const tabs = useMemo(() => {
    const role = user?.role;
    const canManage = role === "admin" || role === "case_worker";
    const isParent = role === "biological_parent" || role === "foster_parent";

    if (isParent) return parentTabs;

    let list = [...baseTabs];
    if (canManage) list = [["manager", "Manager"], ...list];
    return list;
  }, [user?.role]);

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter((c) => (c.title || "").toLowerCase().includes(q) || (c.id || "").toLowerCase().includes(q));
  }, [cases, caseSearch]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);
  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done").length, [tasks]);

  const currentCaseCalendarEvents = useMemo(() => {
    const out = [];
    for (const e of timeline) {
      if (!e.createdAt) continue;
      out.push({ id: `tl-${e.id}`, type: "timeline", label: e.text, date: new Date(e.createdAt), caseId });
    }
    for (const t of tasks) {
      if (!t.dueAt && !t.createdAt) continue;
      out.push({ id: `task-${t.id}`, type: "task", label: `${t.title} (${t.status})`, date: new Date(t.dueAt || t.createdAt), caseId });
    }
    return out.filter((x) => !Number.isNaN(x.date.getTime()));
  }, [timeline, tasks, caseId]);

  const calendarEvents = useMemo(() => {
    return calendarScope === "all" ? allCalendarEvents : currentCaseCalendarEvents;
  }, [calendarScope, allCalendarEvents, currentCaseCalendarEvents]);

  const monthGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = calendarEvents.filter((ev) => {
        const evKey = `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, "0")}-${String(ev.date.getDate()).padStart(2, "0")}`;
        return evKey === key;
      }).length;
      cells.push({ day, key, count });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth, calendarEvents]);

  const selectedDayEvents = useMemo(() => {
    return calendarEvents.filter((ev) => {
      const evKey = `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, "0")}-${String(ev.date.getDate()).padStart(2, "0")}`;
      return evKey === selectedDayKey;
    });
  }, [calendarEvents, selectedDayKey]);

  const upcomingItems = useMemo(() => {
    const now = new Date();
    return [...calendarEvents]
      .filter((ev) => ev.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => a.date - b.date)
      .slice(0, 6);
  }, [calendarEvents]);

  const filteredDocuments = useMemo(() => {
    if (docFilterCategory === "all") return documents;
    return documents.filter((d) => (d.category || "general") === docFilterCategory);
  }, [documents, docFilterCategory]);

  useEffect(() => localStorage.setItem("cc_api_base", apiBase), [apiBase]);
  useEffect(() => token ? localStorage.setItem("cc_token", token) : localStorage.removeItem("cc_token"), [token]);
  useEffect(() => user ? localStorage.setItem("cc_user", JSON.stringify(user)) : localStorage.removeItem("cc_user"), [user]);

  useEffect(() => {
    if (token && !cases.length) refreshCases().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (token && caseId) refreshCaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    if (!tabs.some(([k]) => k === tab)) {
      setTab(tabs[0]?.[0] || "overview");
    }
  }, [tabs, tab]);

  useEffect(() => {
    const isParent = user?.role === "biological_parent" || user?.role === "foster_parent";
    if (isParent && tab !== "parent_home") setTab("parent_home");
  }, [user?.role]);

  useEffect(() => {
    if (tab === "calendar" && calendarScope === "all" && token) {
      loadAllCalendarEvents();
    }
    if (tab === "manager" && token) {
      loadManagerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, calendarScope, token, cases.length]);

  async function requestCode() {
    setLoading(true); setError("");
    try {
      const out = await apiRequest({ baseUrl: apiBase, path: "/auth/request-code", method: "POST", body: { email } });
      if (out.devCode) setCode(String(out.devCode));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function verifyCode() {
    setLoading(true); setError("");
    try {
      const out = await apiRequest({ baseUrl: apiBase, path: "/auth/verify-code", method: "POST", body: { email, code } });
      setToken(out.token); setUser(out.user);
      await refreshCases(out.token);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  function signOut() {
    setToken(""); setUser(null); setCaseId("");
    setCases([]); setTimeline([]); setTasks([]); setMessages([]); setDocuments([]); setInvites([]);
  }

  async function refreshCases(authToken = token) {
    const out = await apiRequest({ baseUrl: apiBase, path: "/cases", token: authToken });
    const list = out.cases || [];
    setCases(list);
    if (!caseId && list.length) setCaseId(list[0].id);
  }

  async function refreshCaseData() {
    if (!caseId) return;
    setLoading(true); setError("");
    try {
      const [t, k, m, d, i] = await Promise.all([
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/timeline`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/tasks`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/messages`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/documents`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/invites`, token }).catch(() => ({ invites: [] })),
      ]);
      setTimeline(t.events || []); setTasks(k.tasks || []); setMessages(m.messages || []); setDocuments(d.documents || []); setInvites(i.invites || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function loadManagerData() {
    setLoading(true); setError("");
    try {
      const [c, w, u] = await Promise.all([
        apiRequest({ baseUrl: apiBase, path: "/management/cases", token }),
        apiRequest({ baseUrl: apiBase, path: "/management/caseworkers", token }),
        apiRequest({ baseUrl: apiBase, path: "/management/users", token }).catch(() => ({ users: [] })),
      ]);
      setManagerCases(c.cases || []);
      setManagerWorkers(w.caseworkers || []);
      setManagerUsers(u.users || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function assignCaseWorker(managedCaseId, caseWorkerUserId) {
    if (!managedCaseId || !caseWorkerUserId) return;
    setLoading(true); setError("");
    try {
      await apiRequest({
        baseUrl: apiBase,
        path: `/management/cases/${managedCaseId}/assign`,
        method: "POST",
        token,
        body: { caseWorkerUserId },
      });
      await Promise.all([loadManagerData(), refreshCases()]);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function updateUserRole(userId, role) {
    if (!userId || !role) return;
    setLoading(true); setError("");
    try {
      await apiRequest({
        baseUrl: apiBase,
        path: `/management/users/${userId}/role`,
        method: "PATCH",
        token,
        body: { role },
      });
      await loadManagerData();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function loadAllCalendarEvents() {
    if (!cases.length) return;
    setLoading(true); setError("");
    try {
      const all = [];
      for (const c of cases) {
        // eslint-disable-next-line no-await-in-loop
        const [t, k] = await Promise.all([
          apiRequest({ baseUrl: apiBase, path: `/cases/${c.id}/timeline`, token }),
          apiRequest({ baseUrl: apiBase, path: `/cases/${c.id}/tasks`, token }),
        ]);
        for (const e of (t.events || [])) {
          if (!e.createdAt) continue;
          all.push({ id: `tl-${e.id}`, type: "timeline", label: `${c.title}: ${e.text}`, date: new Date(e.createdAt), caseId: c.id });
        }
        for (const task of (k.tasks || [])) {
          if (!task.dueAt && !task.createdAt) continue;
          all.push({ id: `task-${task.id}`, type: "task", label: `${c.title}: ${task.title} (${task.status})`, date: new Date(task.dueAt || task.createdAt), caseId: c.id });
        }
      }
      setAllCalendarEvents(all.filter((x) => !Number.isNaN(x.date.getTime())));
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function quickPost() {
    if (!compose.trim() || !caseId) return;
    setLoading(true); setError("");
    try {
      if (tab === "timeline") await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/timeline`, method: "POST", token, body: { type: "note", text: compose.trim() } });
      if (tab === "messages") await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/messages`, method: "POST", token, body: { body: compose.trim() } });
      if (tab === "tasks") await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/tasks`, method: "POST", token, body: { title: compose.trim() } });
      setCompose("");
      await refreshCaseData();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function updateTask(taskId, status) {
    setLoading(true); setError("");
    try {
      await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/tasks/${taskId}`, method: "PATCH", token, body: { status } });
      await refreshCaseData();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function createInvite() {
    if (!inviteEmail.trim()) return;
    setLoading(true); setError("");
    try {
      await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/invites`, method: "POST", token, body: { email: inviteEmail.trim(), role: inviteRole } });
      setInviteEmail("");
      await refreshCaseData();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  async function uploadDocument() {
    if (!caseId || !docFile) return;
    setLoading(true); setError("");
    try {
      const name = docName.trim() || docFile.name;
      const presign = await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/documents/presign`, method: "POST", token, body: { fileName: docFile.name, contentType: docFile.type || "application/octet-stream" } });
      const upload = presign.upload;
      const uploadRes = await fetch(upload.uploadUrl, { method: upload.method || "PUT", headers: upload.headers || { "Content-Type": docFile.type || "application/octet-stream" }, body: docFile });
      if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`);
      await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/documents`, method: "POST", token, body: { name, url: upload.fileUrl, visibility: docVisibility, category: docCategory } });
      setDocName(""); setDocFile(null); setDocCategory("general");
      await refreshCaseData();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand">
            <img src="/carecircle-logo.svg" alt="CareCircle logo" className="brand-logo" />
            <h1>CareCircle</h1>
          </div>
          <p className="muted">Secure case coordination for families and care teams.</p>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <button onClick={requestCode}>Request code</button>
          <label>One-time code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          <button onClick={verifyCode}>Verify & Sign in</button>
          <label>API Base URL</label>
          <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
          {loading ? <div className="muted">Loading…</div> : null}
          {error ? <div className="error">{error}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand brand-sidebar">
          <img src="/carecircle-logo.svg" alt="CareCircle logo" className="brand-logo small" />
          <h2>CareCircle</h2>
        </div>
        <div className="user-block">
          <div className="user-name">{user?.fullName}</div>
          <div className="muted">{roleLabel(user?.role)}</div>
        </div>

        <div className="sidebar-section">
          <label className="sidebar-label">Current Case</label>
          <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button className="secondary" onClick={() => refreshCases()}>Refresh Cases</button>
        </div>

        <div className="tab-list">
          {tabs.map(([k, label]) => (
            <button key={k} className={tab === k ? "tab active" : "tab"} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <button className="secondary" onClick={signOut}>Sign out</button>
      </aside>

      <main className="main">
        <section className="case-context card">
          <div className="case-pill-label">Current Case</div>
          <div className="case-pill-main">{selectedCase?.title || "No case selected"}</div>
          <div className="case-pill-sub">{selectedCase?.id || "—"}</div>
        </section>

        <section className="stats-grid">
          <div className="card stat"><div className="muted">Open Tasks</div><div className="stat-value">{openTasks}</div></div>
          <div className="card stat"><div className="muted">Completed Tasks</div><div className="stat-value">{doneTasks}</div></div>
          <div className="card stat"><div className="muted">Messages</div><div className="stat-value">{messages.length}</div></div>
          <div className="card stat"><div className="muted">Documents</div><div className="stat-value">{documents.length}</div></div>
        </section>

        <section className="card content">
          {(tab === "timeline" || tab === "tasks" || tab === "messages") && (
            <div className="composer row">
              <input value={compose} onChange={(e) => setCompose(e.target.value)} placeholder={tab === "tasks" ? "Create a task…" : "Write an update…"} />
              <button onClick={quickPost}>Post</button>
            </div>
          )}

          {tab === "parent_home" && (
            <div className="overview-grid">
              <div>
                <h3>What’s Next</h3>
                {upcomingItems.length === 0 ? <div className="muted">No upcoming items yet.</div> : null}
                {upcomingItems.map((ev) => (
                  <div key={ev.id} className="item">
                    <div>{ev.label}</div>
                    <div className="muted">{ev.date.toLocaleDateString()} • {ev.type}</div>
                  </div>
                ))}
              </div>
              <div>
                <h3>Recent Messages</h3>
                {messages.slice(0, 6).map((m) => <div key={m.id} className="item">{m.body}</div>)}
                {messages.length === 0 ? <div className="muted">No messages yet.</div> : null}
              </div>
              <div>
                <h3>Documents by Category</h3>
                <div className="row">
                  {["all", "school", "medical", "court", "visits", "general"].map((cat) => {
                    const docs = cat === "all" ? documents : documents.filter((d) => (d.category || "general") === cat);
                    if (cat !== "all" && !docs.length) return null;
                    return (
                      <button
                        key={cat}
                        className={docFilterCategory === cat ? `chip active cat-${cat}` : `chip cat-${cat}`}
                        onClick={() => {
                          setDocFilterCategory(cat);
                          setTab("documents");
                        }}
                      >
                        {DOC_CATEGORY_META[cat]?.icon || "📄"} {DOC_CATEGORY_META[cat]?.label || cat} ({docs.length})
                      </button>
                    );
                  })}
                </div>
                {documents.length === 0 ? <div className="muted">No documents uploaded yet.</div> : null}
              </div>
            </div>
          )}

          {tab === "manager" && (
            <div className="cases-wrap">
              <div className="row between">
                <h3>Management Console</h3>
                <button className="secondary" onClick={loadManagerData}>Refresh Console</button>
              </div>
              <div className="muted">Assign or reassign case workers across all cases.</div>
              <div className="cases-grid">
                {managerCases.map((mc) => (
                  <div key={mc.id} className="item case-card">
                    <div>
                      <div className="case-title">{mc.title}</div>
                      <div className="muted">Current worker: {mc.primaryCaseWorkerName || "Unassigned"}</div>
                    </div>
                    <div className="row">
                      <select
                        defaultValue=""
                        onChange={(e) => assignCaseWorker(mc.id, e.target.value)}
                      >
                        <option value="" disabled>Assign case worker…</option>
                        {managerWorkers.map((w) => (
                          <option key={w.id} value={w.id}>{w.fullName} ({w.assignedCaseCount})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {user?.role === "admin" && (
                <>
                  <h3>Account Types</h3>
                  <div className="muted">Assign roles/account types for platform users.</div>
                  <div className="cases-grid">
                    {managerUsers.map((u) => (
                      <div key={u.id} className="item case-card">
                        <div>
                          <div className="case-title">{u.fullName}</div>
                          <div className="muted">{u.email}</div>
                        </div>
                        <div className="row">
                          <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)}>
                            <option value="admin">{roleLabel("admin")}</option>
                            <option value="case_worker">{roleLabel("case_worker")}</option>
                            <option value="gal">{roleLabel("gal")}</option>
                            <option value="foster_parent">{roleLabel("foster_parent")}</option>
                            <option value="biological_parent">{roleLabel("biological_parent")}</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "cases" && (
            <div className="cases-wrap">
              <div className="row between">
                <h3>My Cases</h3>
                <input value={caseSearch} onChange={(e) => setCaseSearch(e.target.value)} placeholder="Search cases…" />
              </div>
              <div className="cases-grid">
                {filteredCases.map((c) => (
                  <div key={c.id} className={`item case-card ${caseId === c.id ? "active" : ""}`}>
                    <div>
                      <div className="case-title">{c.title}</div>
                      <div className="muted">{c.id}</div>
                    </div>
                    <div className="row">
                      <button className="secondary" onClick={() => { setCaseId(c.id); setTab("overview"); }}>Open Dashboard</button>
                    </div>
                  </div>
                ))}
                {filteredCases.length === 0 ? <div className="muted">No cases found.</div> : null}
              </div>
            </div>
          )}

          {tab === "overview" && (
            <div className="overview-grid">
              <div>
                <h3>Recent Timeline</h3>
                {timeline.slice(0, 5).map((e) => <div key={e.id} className="item">[{e.type}] {e.text}</div>)}
              </div>
              <div>
                <h3>Tasks Needing Attention</h3>
                {tasks.filter((t) => t.status !== "done").slice(0, 5).map((t) => <div key={t.id} className="item">{t.title} <span className="muted">({t.status})</span></div>)}
              </div>
            </div>
          )}

          {tab === "timeline" && timeline.map((e) => <div key={e.id} className="item">[{e.type}] {e.text}</div>)}

          {tab === "calendar" && (
            <div className="calendar-wrap">
              <div className="row between">
                <h3>
                  {calendarMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </h3>
                <div className="row">
                  <select value={calendarScope} onChange={(e) => setCalendarScope(e.target.value)}>
                    <option value="current">Current case only</option>
                    <option value="all">All my cases</option>
                  </select>
                  <button className="secondary" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>Prev</button>
                  <button className="secondary" onClick={() => setCalendarMonth(new Date())}>Today</button>
                  <button className="secondary" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>Next</button>
                </div>
              </div>
              <div className="calendar-grid-head">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="calendar-grid">
                {monthGrid.map((cell, idx) => (
                  <button
                    key={idx}
                    className={`calendar-cell ${cell ? "" : "empty"} ${cell && cell.key === selectedDayKey ? "active" : ""}`}
                    disabled={!cell}
                    onClick={() => cell && setSelectedDayKey(cell.key)}
                  >
                    {cell ? (
                      <>
                        <span>{cell.day}</span>
                        {cell.count > 0 ? <span className="dot">{cell.count}</span> : null}
                      </>
                    ) : null}
                  </button>
                ))}
              </div>
              <div>
                <h4>Events on {selectedDayKey}</h4>
                {selectedDayEvents.length === 0 ? <div className="muted">No items for this day.</div> : null}
                {selectedDayEvents.map((ev) => (
                  <div key={ev.id} className="item">[{ev.type}] {ev.label}</div>
                ))}
              </div>
            </div>
          )}

          {tab === "tasks" && tasks.map((t) => (
            <div key={t.id} className="item task-row">
              <div>
                <div>{t.title}</div>
                <div className="muted">{t.status}</div>
              </div>
              <div className="row">
                {["open", "in_progress", "done"].map((s) => <button key={s} className="secondary" onClick={() => updateTask(t.id, s)}>{s}</button>)}
              </div>
            </div>
          ))}

          {tab === "messages" && messages.map((m) => <div key={m.id} className="item">{m.body}</div>)}

          {tab === "documents" && (
            <>
              <div className="row doc-upload">
                <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Document name (optional)" />
                <select value={docVisibility} onChange={(e) => setDocVisibility(e.target.value)}>
                  <option value="all">all</option>
                  <option value="professionals_only">professionals_only</option>
                  <option value="parents_only">parents_only</option>
                </select>
                <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                  <option value="general">general</option>
                  <option value="school">school</option>
                  <option value="medical">medical</option>
                  <option value="court">court</option>
                  <option value="visits">visits</option>
                </select>
                <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                <button onClick={uploadDocument}>Upload</button>
              </div>
              <div className="row">
                {["all", "school", "medical", "court", "visits", "general"].map((cat) => {
                  const docs = cat === "all" ? documents : documents.filter((d) => (d.category || "general") === cat);
                  if (cat !== "all" && !docs.length) return null;
                  return (
                    <button key={cat} className={docFilterCategory === cat ? `chip active cat-${cat}` : `chip cat-${cat}`} onClick={() => setDocFilterCategory(cat)}>
                      {DOC_CATEGORY_META[cat]?.icon || "📄"} {DOC_CATEGORY_META[cat]?.label || cat} ({docs.length})
                    </button>
                  );
                })}
              </div>
              {filteredDocuments.map((d) => <div key={d.id} className="item"><div>{d.name}</div><div className="muted">{d.category || "general"} • {d.url}</div></div>)}
              {filteredDocuments.length === 0 ? <div className="muted">No documents in this category.</div> : null}
            </>
          )}

          {tab === "invites" && (
            <>
              <div className="row">
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="invite email" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="biological_parent">{roleLabel("biological_parent")}</option>
                  <option value="foster_parent">{roleLabel("foster_parent")}</option>
                  <option value="case_worker">{roleLabel("case_worker")}</option>
                  <option value="gal">{roleLabel("gal")}</option>
                </select>
                <button onClick={createInvite}>Invite</button>
              </div>
              {invites.map((i) => <div key={i.id} className="item">{i.email} • {i.role} • {i.status}</div>)}
            </>
          )}

          {loading ? <div className="muted">Loading…</div> : null}
          {error ? <div className="error">{error}</div> : null}
        </section>
      </main>
    </div>
  );
}
