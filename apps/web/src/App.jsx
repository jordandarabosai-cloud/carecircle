import React, { useEffect, useMemo, useState } from "react";

const defaultApiBase = "http://localhost:4010";

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

const tabs = ["timeline", "tasks", "messages", "documents", "invites"];

export default function App() {
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [email, setEmail] = useState("worker@carecircle.dev");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState("");

  const [timeline, setTimeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [invites, setInvites] = useState([]);

  const [tab, setTab] = useState("timeline");
  const [compose, setCompose] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("biological_parent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCase = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  useEffect(() => {
    if (token && caseId) refreshCaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function requestCode() {
    setLoading(true);
    setError("");
    try {
      const out = await apiRequest({ baseUrl: apiBase, path: "/auth/request-code", method: "POST", body: { email } });
      if (out.devCode) setCode(String(out.devCode));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setError("");
    try {
      const out = await apiRequest({ baseUrl: apiBase, path: "/auth/verify-code", method: "POST", body: { email, code } });
      setToken(out.token);
      setUser(out.user);
      await refreshCases(out.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshCases(authToken = token) {
    const out = await apiRequest({ baseUrl: apiBase, path: "/cases", token: authToken });
    setCases(out.cases || []);
    if (!caseId && out.cases?.length) setCaseId(out.cases[0].id);
  }

  async function refreshCaseData() {
    if (!caseId) return;
    setLoading(true);
    setError("");
    try {
      const [t, k, m, d, i] = await Promise.all([
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/timeline`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/tasks`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/messages`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/documents`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/invites`, token }).catch(() => ({ invites: [] })),
      ]);
      setTimeline(t.events || []);
      setTasks(k.tasks || []);
      setMessages(m.messages || []);
      setDocuments(d.documents || []);
      setInvites(i.invites || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function quickPost() {
    if (!compose.trim() || !caseId) return;
    setLoading(true);
    setError("");
    try {
      if (tab === "timeline") {
        await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/timeline`, method: "POST", token, body: { type: "note", text: compose.trim() } });
      } else if (tab === "messages") {
        await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/messages`, method: "POST", token, body: { body: compose.trim() } });
      } else if (tab === "tasks") {
        await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/tasks`, method: "POST", token, body: { title: compose.trim() } });
      }
      setCompose("");
      await refreshCaseData();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateTask(taskId, status) {
    setLoading(true);
    setError("");
    try {
      await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/tasks/${taskId}`, method: "PATCH", token, body: { status } });
      await refreshCaseData();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createInvite() {
    if (!inviteEmail.trim()) return;
    setLoading(true);
    setError("");
    try {
      await apiRequest({
        baseUrl: apiBase,
        path: `/cases/${caseId}/invites`,
        method: "POST",
        token,
        body: { email: inviteEmail.trim(), role: inviteRole },
      });
      setInviteEmail("");
      await refreshCaseData();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>CareCircle Web</h1>

      <section className="card">
        <label>API Base URL</label>
        <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
      </section>

      {!token ? (
        <section className="card">
          <h3>Sign in (OTP)</h3>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <button onClick={requestCode}>Request code</button>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="code" />
          <button onClick={verifyCode}>Verify</button>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="row between">
              <div>Signed in as <b>{user?.fullName}</b> ({user?.role})</div>
              <button className="secondary" onClick={() => { setToken(""); setUser(null); }}>Sign out</button>
            </div>
            <div className="row">
              <button onClick={() => refreshCases()}>Refresh cases</button>
              {cases.map((c) => (
                <button key={c.id} className={caseId === c.id ? "tab active" : "tab"} onClick={() => setCaseId(c.id)}>{c.title}</button>
              ))}
            </div>
            {selectedCase ? <div className="muted">Selected: {selectedCase.title}</div> : null}
            <button onClick={refreshCaseData}>Refresh selected case</button>
          </section>

          <section className="card">
            <div className="row">
              {tabs.map((t) => (
                <button key={t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>

            {["timeline", "tasks", "messages"].includes(tab) ? (
              <div className="row">
                <input value={compose} onChange={(e) => setCompose(e.target.value)} placeholder={tab === "tasks" ? "New task title" : "Write update..."} />
                <button onClick={quickPost}>Post</button>
              </div>
            ) : null}

            <div>
              {tab === "timeline" && timeline.map((e) => <div key={e.id} className="item">[{e.type}] {e.text}</div>)}
              {tab === "tasks" && tasks.map((t) => (
                <div key={t.id} className="item">
                  <div>{t.title}</div>
                  <div className="muted">{t.status}</div>
                  <div className="row">
                    {["open", "in_progress", "done"].map((s) => (
                      <button key={s} className="secondary" onClick={() => updateTask(t.id, s)}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
              {tab === "messages" && messages.map((m) => <div key={m.id} className="item">{m.body}</div>)}
              {tab === "documents" && documents.map((d) => <div key={d.id} className="item"><div>{d.name}</div><div className="muted">{d.url}</div></div>)}
              {tab === "invites" && (
                <div>
                  <div className="row">
                    <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="invite email" />
                    <input value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} placeholder="role" />
                    <button onClick={createInvite}>Invite</button>
                  </div>
                  {invites.map((i) => <div key={i.id} className="item">{i.email} • {i.role} • {i.status}</div>)}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {loading ? <div className="muted">Loading...</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}
