const state = {
  apiBase: 'http://localhost:4010',
  token: '',
  user: null,
  cases: [],
  caseId: '',
  tab: 'timeline',
  timeline: [],
  tasks: [],
  messages: [],
  documents: [],
  invites: [],
};

const tabs = ['timeline', 'tasks', 'messages', 'documents', 'invites'];

const el = {
  platform: document.getElementById('platform'),
  apiBase: document.getElementById('apiBase'),
  email: document.getElementById('email'),
  code: document.getElementById('code'),
  authHint: document.getElementById('authHint'),
  requestCodeBtn: document.getElementById('requestCodeBtn'),
  verifyBtn: document.getElementById('verifyBtn'),
  authCard: document.getElementById('authCard'),
  sessionCard: document.getElementById('sessionCard'),
  workspaceCard: document.getElementById('workspaceCard'),
  sessionText: document.getElementById('sessionText'),
  caseButtons: document.getElementById('caseButtons'),
  refreshCasesBtn: document.getElementById('refreshCasesBtn'),
  signOutBtn: document.getElementById('signOutBtn'),
  tabs: document.getElementById('tabs'),
  composerRow: document.getElementById('composerRow'),
  composeInput: document.getElementById('composeInput'),
  postBtn: document.getElementById('postBtn'),
  content: document.getElementById('content'),
  status: document.getElementById('status'),
};

el.platform.textContent = `Platform: ${window.carecircle?.platform || 'unknown'}`;

function setStatus(text) { el.status.textContent = text || ''; }

async function apiRequest(path, method = 'GET', body) {
  const res = await fetch(`${state.apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

function renderTabs() {
  el.tabs.innerHTML = '';
  for (const t of tabs) {
    const b = document.createElement('button');
    b.className = `tab ${state.tab === t ? 'active' : ''}`;
    b.textContent = t[0].toUpperCase() + t.slice(1);
    b.onclick = async () => {
      state.tab = t;
      render();
    };
    el.tabs.appendChild(b);
  }
}

function renderContent() {
  const list = state.tab === 'timeline' ? state.timeline
    : state.tab === 'tasks' ? state.tasks
    : state.tab === 'messages' ? state.messages
    : state.tab === 'documents' ? state.documents
    : state.invites;

  el.composerRow.style.display = ['timeline', 'tasks', 'messages'].includes(state.tab) ? 'flex' : 'none';
  el.content.innerHTML = '';

  if (!list.length) {
    el.content.innerHTML = '<div class="muted">No items yet.</div>';
    return;
  }

  list.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'item';

    if (state.tab === 'timeline') div.textContent = `[${item.type}] ${item.text}`;
    if (state.tab === 'tasks') {
      div.innerHTML = `<div>${item.title}</div><div class="muted">Status: ${item.status}</div>`;
      const row = document.createElement('div');
      row.className = 'row';
      ['open', 'in_progress', 'done'].forEach((s) => {
        const btn = document.createElement('button');
        btn.textContent = s;
        btn.className = 'secondary';
        btn.onclick = async () => {
          await apiRequest(`/cases/${state.caseId}/tasks/${item.id}`, 'PATCH', { status: s });
          await refreshCaseData();
        };
        row.appendChild(btn);
      });
      div.appendChild(row);
    }
    if (state.tab === 'messages') div.textContent = item.body;
    if (state.tab === 'documents') div.innerHTML = `<div>${item.name}</div><div class="muted">${item.url}</div>`;
    if (state.tab === 'invites') div.innerHTML = `<div>${item.email}</div><div class="muted">${item.role} • ${item.status}</div>`;

    el.content.appendChild(div);
  });
}

function render() {
  const loggedIn = Boolean(state.token);
  el.authCard.classList.toggle('hidden', loggedIn);
  el.sessionCard.classList.toggle('hidden', !loggedIn);
  el.workspaceCard.classList.toggle('hidden', !loggedIn);

  if (!loggedIn) return;

  el.sessionText.textContent = `Signed in as ${state.user?.fullName || ''} (${state.user?.role || ''})`;
  el.caseButtons.innerHTML = '';
  state.cases.forEach((c) => {
    const b = document.createElement('button');
    b.className = `tab ${state.caseId === c.id ? 'active' : ''}`;
    b.textContent = c.title;
    b.onclick = async () => {
      state.caseId = c.id;
      await refreshCaseData();
    };
    el.caseButtons.appendChild(b);
  });

  renderTabs();
  renderContent();
}

async function refreshCases() {
  const out = await apiRequest('/cases');
  state.cases = out.cases || [];
  if (!state.caseId && state.cases.length) state.caseId = state.cases[0].id;
}

async function refreshCaseData() {
  if (!state.caseId) return;
  const [t, k, m, d, i] = await Promise.all([
    apiRequest(`/cases/${state.caseId}/timeline`),
    apiRequest(`/cases/${state.caseId}/tasks`),
    apiRequest(`/cases/${state.caseId}/messages`),
    apiRequest(`/cases/${state.caseId}/documents`),
    apiRequest(`/cases/${state.caseId}/invites`).catch(() => ({ invites: [] })),
  ]);
  state.timeline = t.events || [];
  state.tasks = k.tasks || [];
  state.messages = m.messages || [];
  state.documents = d.documents || [];
  state.invites = i.invites || [];
  render();
}

el.apiBase.addEventListener('change', () => { state.apiBase = el.apiBase.value.trim(); });

el.requestCodeBtn.onclick = async () => {
  try {
    setStatus('Requesting code...');
    const out = await apiRequest('/auth/request-code', 'POST', { email: el.email.value.trim() });
    if (out.devCode) el.code.value = String(out.devCode);
    el.authHint.textContent = out.devCode ? `Dev code autofilled: ${out.devCode}` : 'Code sent via configured delivery mode';
    setStatus('');
  } catch (e) {
    setStatus(e.message);
  }
};

el.verifyBtn.onclick = async () => {
  try {
    setStatus('Verifying...');
    const out = await apiRequest('/auth/verify-code', 'POST', { email: el.email.value.trim(), code: el.code.value.trim() });
    state.token = out.token;
    state.user = out.user;
    await refreshCases();
    await refreshCaseData();
    setStatus('');
    render();
  } catch (e) {
    setStatus(e.message);
  }
};

el.refreshCasesBtn.onclick = async () => {
  try {
    await refreshCases();
    await refreshCaseData();
  } catch (e) {
    setStatus(e.message);
  }
};

el.signOutBtn.onclick = () => {
  state.token = '';
  state.user = null;
  state.cases = [];
  state.caseId = '';
  state.timeline = [];
  state.tasks = [];
  state.messages = [];
  state.documents = [];
  state.invites = [];
  render();
};

el.postBtn.onclick = async () => {
  const text = el.composeInput.value.trim();
  if (!text || !state.caseId) return;

  try {
    if (state.tab === 'timeline') await apiRequest(`/cases/${state.caseId}/timeline`, 'POST', { type: 'note', text });
    if (state.tab === 'messages') await apiRequest(`/cases/${state.caseId}/messages`, 'POST', { body: text });
    if (state.tab === 'tasks') await apiRequest(`/cases/${state.caseId}/tasks`, 'POST', { title: text });
    el.composeInput.value = '';
    await refreshCaseData();
  } catch (e) {
    setStatus(e.message);
  }
};

render();
