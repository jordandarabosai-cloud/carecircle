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

const tabs = ["timeline", "tasks", "messages", "documents", "invites"];

export default function App() {
  const [apiBase, setApiBase] = useState(() => localStorage.getItem("cc_api_base") || defaultApiBase);
  const [email, setEmail] = useState("worker@carecircle.dev");
  const [code, setCode] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("cc_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("cc_user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
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
  const [docName, setDocName] = useState("");
  const [docVisibility, setDocVisibility] = useState("all");
  const [docFile, setDocFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCase = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  useEffect(() => {
    localStorage.setItem("cc_api_base", apiBase);
  }, [apiBase]);

  useEffect(() => {
    if (token) localStorage.setItem("cc_token", token);
    else localStorage.removeItem("cc_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("cc_user", JSON.stringify(user));
    else localStorage.removeItem("cc_user");
  }, [user]);

  useEffect(() => {
    if (token && !cases.length) {
      refreshCases().catch((e) => setError(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  function signOut() {
    setToken("");
    setUser(null);
    setCaseId("");
    setCases([]);
    setTimeline([]);
    setTasks([]);
    setMessages([]);
    setDocuments([]);
    setInvites([]);
  }

  async function refreshCases(authToken = token) {
    const out = await apiRequest({ baseUrl: apiBase, path: "/cases", token: authToken });
    const list = out.cases || [];
    setCases(list);
    if (!caseId && list.length) setCaseId(list[0].id);
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

  async function uploadDocument() {
    if (!caseId || !docFile) return;

    setLoading(true);
    setError("");
    try {
      const name = docName.trim() || docFile.name;

      const presign = await apiRequest({
        baseUrl: apiBase,
        path: `/cases/${caseId}/documents/presign`,
        method: "POST",
        token,
        body: { fileName: docFile.name, contentType: docFile.type || "application/octet-stream" },
      });

      const upload = presign.upload;
      const uploadRes = await fetch(upload.uploadUrl, {
        method: upload.method || "PUT",
        headers: upload.headers || { "Content-Type": docFile.type || "application/octet-stream" },
        body: docFile,
      });

      if (!uploadRes.ok) throw new Error(`Upload failed (${uploadRes.status})`);

      await apiRequest({
        baseUrl: apiBase,
        path: `/cases/${caseId}/documents`,
        method: "POST",
        token,
        body: {
          name,
          url: upload.fileUrl,
          visibility: docVisibility,
        },
      });

      setDocName("");
      setDocFile(null);
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
              <button className="secondary" onClick={signOut}>Sign out</button>
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

            {tab === "documents" && (
              <>
                <div className="row">
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
              <div>
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
              </div>
            )}
          </section>
        </>
      )}

      {loading ? <div className="muted">Loading...</div> : null}
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}
