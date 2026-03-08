import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";

const defaultApiBase = "http://localhost:4010";

const styles = {
  screen: { flex: 1, backgroundColor: "#0b1020" },
  wrap: { padding: 16, gap: 12 },
  card: { backgroundColor: "#161d35", borderRadius: 12, padding: 12, gap: 8 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  text: { color: "#d8def0" },
  muted: { color: "#9fb0ff" },
  input: { backgroundColor: "#0f1530", color: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#2a3358" },
  button: { backgroundColor: "#4463ff", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  buttonSecondary: { backgroundColor: "#2a3358", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { borderWidth: 1, borderColor: "#425089", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  tabOn: { backgroundColor: "#27315d" },
  tabText: { color: "#d8def0" },
  mono: { color: "#9fb0ff", fontFamily: "monospace" },
  item: { backgroundColor: "#0f1530", borderWidth: 1, borderColor: "#2a3358", borderRadius: 10, padding: 10, gap: 6 },
  status: { fontWeight: "700", color: "#9fb0ff" },
};

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
  ["timeline", "Timeline"],
  ["tasks", "Tasks"],
  ["messages", "Messages"],
  ["documents", "Documents"],
  ["invites", "Invites"],
];

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
  const [loading, setLoading] = useState(false);

  const [compose, setCompose] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("biological_parent");

  const selectedCase = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  useEffect(() => {
    if (token && caseId) refreshCaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function requestCode() {
    setLoading(true);
    try {
      const out = await apiRequest({ baseUrl: apiBase, path: "/auth/request-code", method: "POST", body: { email } });
      if (out.devCode) setCode(String(out.devCode));
      Alert.alert("Code requested", out.devCode ? `Dev code autofilled: ${out.devCode}` : "Check your delivery channel");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    try {
      const out = await apiRequest({ baseUrl: apiBase, path: "/auth/verify-code", method: "POST", body: { email, code } });
      setToken(out.token);
      setUser(out.user);
      await refreshCases(out.token);
    } catch (e) {
      Alert.alert("Error", e.message);
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
    setCode("");
  }

  async function refreshCases(authToken = token) {
    const out = await apiRequest({ baseUrl: apiBase, path: "/cases", token: authToken });
    const list = out.cases || [];
    setCases(list);
    if (list.length && !caseId) setCaseId(list[0].id);
    if (caseId && !list.find((c) => c.id === caseId) && list.length) setCaseId(list[0].id);
  }

  async function refreshCaseData() {
    if (!caseId) return;
    setLoading(true);
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
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function quickPost() {
    if (!compose.trim() || !caseId) return;
    setLoading(true);
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
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(taskId, status) {
    setLoading(true);
    try {
      await apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/tasks/${taskId}`, method: "PATCH", token, body: { status } });
      await refreshCaseData();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createInvite() {
    if (!inviteEmail.trim() || !caseId) return;
    setLoading(true);
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
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>CareCircle Mobile</Text>

        <View style={styles.card}>
          <Text style={styles.text}>API Base URL</Text>
          <TextInput style={styles.input} value={apiBase} onChangeText={setApiBase} autoCapitalize="none" />
          <Text style={styles.muted}>Tip: on a physical phone, use your computer LAN IP instead of localhost.</Text>
        </View>

        {!token ? (
          <View style={styles.card}>
            <Text style={styles.text}>Sign in with OTP</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="email" placeholderTextColor="#7f8ab8" />
            <TouchableOpacity style={styles.button} onPress={requestCode}><Text style={styles.buttonText}>Request Code</Text></TouchableOpacity>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="code" placeholderTextColor="#7f8ab8" />
            <TouchableOpacity style={styles.button} onPress={verifyCode}><Text style={styles.buttonText}>Verify</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.text}>Signed in as <Text style={styles.mono}>{user?.fullName}</Text> ({user?.role})</Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.button} onPress={() => refreshCases()}><Text style={styles.buttonText}>Refresh Cases</Text></TouchableOpacity>
                <TouchableOpacity style={styles.buttonSecondary} onPress={signOut}><Text style={styles.buttonText}>Sign out</Text></TouchableOpacity>
              </View>

              <Text style={styles.text}>Select case</Text>
              <View style={styles.row}>
                {cases.map((c) => (
                  <TouchableOpacity key={c.id} style={[styles.tab, caseId === c.id ? styles.tabOn : null]} onPress={() => setCaseId(c.id)}>
                    <Text style={styles.tabText}>{c.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedCase ? <Text style={styles.text}>Selected: {selectedCase.title}</Text> : <Text style={styles.muted}>No case selected</Text>}
              <TouchableOpacity style={styles.button} onPress={refreshCaseData}><Text style={styles.buttonText}>Refresh Selected Case</Text></TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.tabs}>
                {tabs.map(([key, label]) => (
                  <TouchableOpacity key={key} style={[styles.tab, tab === key ? styles.tabOn : null]} onPress={() => setTab(key)}>
                    <Text style={styles.tabText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(tab === "timeline" || tab === "tasks" || tab === "messages") ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={compose}
                    onChangeText={setCompose}
                    placeholder={tab === "tasks" ? "New task title" : "Write update..."}
                    placeholderTextColor="#7f8ab8"
                  />
                  <TouchableOpacity style={styles.button} onPress={quickPost}><Text style={styles.buttonText}>Post</Text></TouchableOpacity>
                </>
              ) : null}

              {tab === "timeline" && timeline.map((e) => (
                <View key={e.id} style={styles.item}>
                  <Text style={styles.muted}>[{e.type}]</Text>
                  <Text style={styles.text}>{e.text}</Text>
                </View>
              ))}

              {tab === "tasks" && tasks.map((t) => (
                <View key={t.id} style={styles.item}>
                  <Text style={styles.text}>{t.title}</Text>
                  <Text style={styles.status}>Status: {t.status}</Text>
                  <View style={styles.row}>
                    {[
                      ["open", "Open"],
                      ["in_progress", "In Progress"],
                      ["done", "Done"],
                    ].map(([s, label]) => (
                      <TouchableOpacity key={s} style={[styles.tab, t.status === s ? styles.tabOn : null]} onPress={() => updateTaskStatus(t.id, s)}>
                        <Text style={styles.tabText}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              {tab === "messages" && messages.map((m) => (
                <View key={m.id} style={styles.item}>
                  <Text style={styles.text}>{m.body}</Text>
                </View>
              ))}

              {tab === "documents" && documents.map((d) => (
                <View key={d.id} style={styles.item}>
                  <Text style={styles.text}>{d.name}</Text>
                  <Text style={styles.mono}>{d.url}</Text>
                </View>
              ))}

              {tab === "invites" && (
                <>
                  <TextInput
                    style={styles.input}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="Invite email"
                    placeholderTextColor="#7f8ab8"
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={styles.input}
                    value={inviteRole}
                    onChangeText={setInviteRole}
                    placeholder="Role (biological_parent, foster_parent, case_worker, gal)"
                    placeholderTextColor="#7f8ab8"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.button} onPress={createInvite}><Text style={styles.buttonText}>Create Invite</Text></TouchableOpacity>
                  {invites.map((i) => (
                    <View key={i.id} style={styles.item}>
                      <Text style={styles.text}>{i.email}</Text>
                      <Text style={styles.muted}>{i.role} • {i.status}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </>
        )}

        {loading ? <ActivityIndicator color="#9fb0ff" /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
