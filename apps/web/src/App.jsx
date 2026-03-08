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

const tabs = [
  ["overview", "Overview"],
  ["timeline", "Timeline"],
  ["tasks", "Tasks"],
  ["messages", "Messages"],
  ["documents", "Documents"],
  ["invites", "Invites"],
];

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

  const [tab, setTab] = useState("overview");
  const [compose, setCompose] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("biological_parent");
  const [docName, setDocName] = useState("");
  const [docVisibility, setDocVisibility] = useState("all");
  const [docFile, setDocFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCase = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);
  const doneTasks = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);
  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "done").length, [tasks]);

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
      await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/documents`, method: "POST", token, body: { name, url: upload.fileUrl, visibility: docVisibility } });
      setDocName(""); setDocFile(null);
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
          <div className="muted">{user?.role}</div>
        </div>
        <div className="tab-list">
          {tabs.map(([k, label]) => (
            <button key={k} className={tab === k ? "tab active" : "tab"} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <button className="secondary" onClick={signOut}>Sign out</button>
      </aside>

      <main className="main">
        <header className="topbar card">
          <div>
            <h1>{selectedCase?.title || "Select a case"}</h1>
            <p className="muted">Dashboard for timeline, tasks, messages, documents, and invites.</p>
          </div>
          <div className="row">
            <select value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <button onClick={() => refreshCases()}>Refresh</button>
          </div>
        </header>

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
                <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                <button onClick={uploadDocument}>Upload</button>
              </div>
              {documents.map((d) => <div key={d.id} className="item"><div>{d.name}</div><div className="muted">{d.url}</div></div>)}
            </>
          )}

          {tab === "invites" && (
            <>
              <div className="row">
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="invite email" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="biological_parent">biological_parent</option>
                  <option value="foster_parent">foster_parent</option>
                  <option value="case_worker">case_worker</option>
                  <option value="gal">gal</option>
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
