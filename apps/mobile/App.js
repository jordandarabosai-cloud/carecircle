import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";

const defaultApiBase = "http://localhost:4010";

const styles = {
  screen: { flex: 1, backgroundColor: "#0b1020" },
  wrap: { padding: 16, gap: 12 },
  card: { backgroundColor: "#161d35", borderRadius: 12, padding: 12, gap: 8 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  text: { color: "#d8def0" },
  input: { backgroundColor: "#0f1530", color: "#fff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#2a3358" },
  button: { backgroundColor: "#4463ff", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { borderWidth: 1, borderColor: "#425089", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  tabOn: { backgroundColor: "#27315d" },
  tabText: { color: "#d8def0" },
  mono: { color: "#9fb0ff", fontFamily: "monospace" },
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

export default function App() {
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [email, setEmail] = useState("worker@carecircle.dev");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [caseId, setCaseId] = useState("");
  const [cases, setCases] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tab, setTab] = useState("timeline");
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState("");

  const selectedCase = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

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

  async function refreshCases(t = token) {
    const out = await apiRequest({ baseUrl: apiBase, path: "/cases", token: t });
    setCases(out.cases || []);
    if (!caseId && out.cases?.length) setCaseId(out.cases[0].id);
  }

  async function refreshCaseData() {
    if (!caseId) return;
    setLoading(true);
    try {
      const [t, k, m, d] = await Promise.all([
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/timeline`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/tasks`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/messages`, token }),
        apiRequest({ baseUrl: apiBase, path: `/cases/${caseId}/documents`, token }),
      ]);
      setTimeline(t.events || []);
      setTasks(k.tasks || []);
      setMessages(m.messages || []);
      setDocuments(d.documents || []);
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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.title}>CareCircle Mobile</Text>
        <View style={styles.card}>
          <Text style={styles.text}>API Base URL</Text>
          <TextInput style={styles.input} value={apiBase} onChangeText={setApiBase} autoCapitalize="none" />
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
              <TouchableOpacity style={styles.button} onPress={() => refreshCases()}><Text style={styles.buttonText}>Refresh Cases</Text></TouchableOpacity>
              <Text style={styles.text}>Case ID</Text>
              <TextInput style={styles.input} value={caseId} onChangeText={setCaseId} autoCapitalize="none" />
              <TouchableOpacity style={styles.button} onPress={refreshCaseData}><Text style={styles.buttonText}>Load Case Data</Text></TouchableOpacity>
              {selectedCase ? <Text style={styles.text}>Selected: {selectedCase.title}</Text> : null}
            </View>

            <View style={styles.card}>
              <View style={styles.tabs}>
                {[
                  ["timeline", "Timeline"],
                  ["tasks", "Tasks"],
                  ["messages", "Messages"],
                  ["documents", "Documents"],
                ].map(([key, label]) => (
                  <TouchableOpacity key={key} style={[styles.tab, tab === key ? styles.tabOn : null]} onPress={() => setTab(key)}>
                    <Text style={styles.tabText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(tab === "timeline" || tab === "tasks" || tab === "messages") ? (
                <>
                  <TextInput style={styles.input} value={compose} onChangeText={setCompose} placeholder={tab === "tasks" ? "New task title" : "Write update..."} placeholderTextColor="#7f8ab8" />
                  <TouchableOpacity style={styles.button} onPress={quickPost}><Text style={styles.buttonText}>Post</Text></TouchableOpacity>
                </>
              ) : null}

              {tab === "timeline" && timeline.map((e) => <Text key={e.id} style={styles.text}>• [{e.type}] {e.text}</Text>)}
              {tab === "tasks" && tasks.map((t) => <Text key={t.id} style={styles.text}>• {t.title} ({t.status})</Text>)}
              {tab === "messages" && messages.map((m) => <Text key={m.id} style={styles.text}>• {m.body}</Text>)}
              {tab === "documents" && documents.map((d) => <Text key={d.id} style={styles.text}>• {d.name}</Text>)}
            </View>
          </>
        )}

        {loading ? <ActivityIndicator color="#9fb0ff" /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
