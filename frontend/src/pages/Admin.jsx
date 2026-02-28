import React, { useState, useEffect } from "react"

const S = {
  card: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, padding: 16, marginBottom: 12 },
  btn: { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14 },
  btnPrimary: { background: "#4f46e5", color: "#fff" },
  btnDanger: { background: "#ef4444", color: "#fff" },
  btnSuccess: { background: "#22c55e", color: "#fff" },
  btnGray: { background: "#e5e7eb", color: "#333" },
  input: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", width: "100%", marginBottom: 8, boxSizing: "border-box" },
  select: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", marginBottom: 8 },
  tab: (active) => ({
    padding: "8px 18px", borderRadius: "6px 6px 0 0", border: "none", cursor: "pointer",
    background: active ? "#4f46e5" : "#e5e7eb",
    color: active ? "#fff" : "#333",
    fontWeight: active ? "bold" : "normal"
  }),
  row: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 },
  badge: (role) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 12,
    background: role === "admin" ? "#fef3c7" : "#dbeafe",
    color: role === "admin" ? "#92400e" : "#1e40af"
  })
}

// ✅ ИСПРАВЛЕНИЕ: TestForm вынесен ЗА пределы Admin.
// Если компонент объявлен ВНУТРИ другого компонента, React считает его новым типом
// при каждом ре-рендере, размонтирует и монтирует заново — из-за этого фокус слетает.
function TestForm({ data, setter, qForm, setQForm, onAddQuestion, onRemoveQuestion, onSubmit, onCancel, submitLabel }) {
  return (
    <div style={S.card}>
      <input
        style={S.input}
        placeholder="Название теста"
        value={data.title}
        onChange={e => setter({ ...data, title: e.target.value })}
      />

      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <b style={{ fontSize: 13, color: "#555" }}>Добавить вопрос</b>
        <input
          style={{ ...S.input, marginTop: 8 }}
          placeholder="Текст вопроса"
          value={qForm.text}
          onChange={e => setQForm({ ...qForm, text: e.target.value })}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {["a", "b", "c", "d"].map(o => (
            <input
              key={o}
              style={{ ...S.input, marginBottom: 0 }}
              placeholder={`Вариант ${o.toUpperCase()}`}
              value={qForm[`option_${o}`]}
              onChange={e => setQForm({ ...qForm, [`option_${o}`]: e.target.value })}
            />
          ))}
        </div>
        <div style={{ ...S.row, marginTop: 8 }}>
          <span style={{ fontSize: 13 }}>Правильный:</span>
          <select style={S.select} value={qForm.correct} onChange={e => setQForm({ ...qForm, correct: e.target.value })}>
            {["a", "b", "c", "d"].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
          </select>
          <button style={{ ...S.btn, ...S.btnSuccess }} onClick={onAddQuestion}>+ Вопрос</button>
        </div>
      </div>

      {data.questions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <b style={{ fontSize: 13, color: "#555" }}>Вопросы ({data.questions.length}):</b>
          {data.questions.map((q, i) => (
            <div key={i} style={{ ...S.row, background: "#f3f4f6", borderRadius: 6, padding: "6px 10px", marginTop: 6 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{i + 1}. {q.text}</span>
              <span style={{ fontSize: 12, color: "#888" }}>верный: {q.correct.toUpperCase()}</span>
              <button style={{ ...S.btn, ...S.btnDanger, padding: "2px 8px" }} onClick={() => onRemoveQuestion(i)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={S.row}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!data.title || data.questions.length === 0} onClick={onSubmit}>
          {submitLabel}
        </button>
        <button style={{ ...S.btn, ...S.btnGray }} onClick={onCancel}>Отмена</button>
      </div>
    </div>
  )
}

export default function Admin({ API, token }) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }

  const [tab, setTab] = useState("tests")
  const [tests, setTests] = useState([])
  const [users, setUsers] = useState([])
  const [results, setResults] = useState([])
  const [editingTest, setEditingTest] = useState(null)
  const [newTest, setNewTest] = useState({ title: "", questions: [] })
  const [qForm, setQForm] = useState({ text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct: "a" })
  const [showCreate, setShowCreate] = useState(false)
  const [msg, setMsg] = useState("")

  const load = () => {
    fetch(`${API}/tests`).then(r => r.json()).then(setTests)
    fetch(`${API}/admin/users`, { headers }).then(r => r.json()).then(setUsers)
    fetch(`${API}/admin/results`, { headers }).then(r => r.json()).then(setResults)
  }

  useEffect(load, [])

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(""), 2500) }
  const resetQForm = () => setQForm({ text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct: "a" })

  const addQuestion = () => {
    if (!qForm.text || !qForm.option_a || !qForm.option_b) return
    const target = editingTest || newTest
    const setter = editingTest ? setEditingTest : setNewTest
    setter({ ...target, questions: [...target.questions, { ...qForm }] })
    resetQForm()
  }

  const removeQuestion = (index) => {
    const target = editingTest || newTest
    const setter = editingTest ? setEditingTest : setNewTest
    setter({ ...target, questions: target.questions.filter((_, i) => i !== index) })
  }

  const createTest = async () => {
    if (!newTest.title || newTest.questions.length === 0) return
    const res = await fetch(`${API}/admin/tests`, { method: "POST", headers, body: JSON.stringify(newTest) })
    if (!res.ok) { flash("❌ Ошибка при создании теста"); return }
    setNewTest({ title: "", questions: [] })
    resetQForm()
    setShowCreate(false)
    load()
    flash("✅ Тест создан!")
  }

  const startEdit = async (id) => {
    const res = await fetch(`${API}/admin/tests/${id}`, { headers })
    const data = await res.json()
    setEditingTest({
      id: data.id,
      title: data.title,
      questions: data.questions.map(q => ({
        text: q.text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct: q.correct || "a"   // correct теперь приходит из бэкенда (исправлено в schemas.py)
      }))
    })
    resetQForm()
  }

  const saveEdit = async () => {
    const res = await fetch(`${API}/admin/tests/${editingTest.id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ title: editingTest.title, questions: editingTest.questions })
    })
    if (!res.ok) { flash("❌ Ошибка при сохранении"); return }
    setEditingTest(null)
    load()
    flash("✅ Тест обновлён!")
  }

  const deleteTest = async (id) => {
    if (!confirm("Удалить тест?")) return
    await fetch(`${API}/admin/tests/${id}`, { method: "DELETE", headers })
    load()
    flash("🗑 Тест удалён")
  }

  const changeRole = async (userId, role) => {
    await fetch(`${API}/admin/users/${userId}/role`, { method: "PUT", headers, body: JSON.stringify({ role }) })
    load()
    flash(`✅ Роль изменена на ${role}`)
  }

  const deleteUser = async (id) => {
    if (!confirm("Удалить пользователя и все его результаты?")) return
    await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers })
    load()
    flash("🗑 Пользователь удалён")
  }

  const deleteResult = async (id) => {
    await fetch(`${API}/admin/results/${id}`, { method: "DELETE", headers })
    load()
    flash("🗑 Результат удалён")
  }

  return (
    <div>
      <h2 style={{ marginBottom: 4 }}>Панель администратора</h2>

      {msg && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 14px", marginBottom: 12, color: "#166534" }}>
          {msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 0 }}>
        {[["tests", "📝 Тесты"], ["users", "👥 Пользователи"], ["results", "📊 Результаты"]].map(([key, label]) => (
          <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <div style={{ border: "1px solid #e0e0e0", borderRadius: "0 8px 8px 8px", padding: 16 }}>

        {tab === "tests" && (
          <div>
            <div style={{ ...S.row, marginBottom: 16 }}>
              <b>Тесты ({tests.length})</b>
              <span style={{ flex: 1 }} />
              {!showCreate && !editingTest && (
                <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => setShowCreate(true)}>
                  + Создать тест
                </button>
              )}
            </div>

            {showCreate && (
              <TestForm
                data={newTest} setter={setNewTest}
                qForm={qForm} setQForm={setQForm}
                onAddQuestion={addQuestion} onRemoveQuestion={removeQuestion}
                submitLabel="Создать тест" onSubmit={createTest}
                onCancel={() => { setShowCreate(false); setNewTest({ title: "", questions: [] }); resetQForm() }}
              />
            )}

            {editingTest && (
              <>
                <b style={{ color: "#4f46e5" }}>✏️ Редактирование теста</b>
                <TestForm
                  data={editingTest} setter={setEditingTest}
                  qForm={qForm} setQForm={setQForm}
                  onAddQuestion={addQuestion} onRemoveQuestion={removeQuestion}
                  submitLabel="Сохранить" onSubmit={saveEdit}
                  onCancel={() => { setEditingTest(null); resetQForm() }}
                />
              </>
            )}

            {!showCreate && !editingTest && tests.map(t => (
              <div key={t.id} style={{ ...S.card, ...S.row }}>
                <span style={{ flex: 1 }}><b>#{t.id}</b> {t.title}</span>
                <button style={{ ...S.btn, ...S.btnGray }} onClick={() => startEdit(t.id)}>✏️ Изменить</button>
                <button style={{ ...S.btn, ...S.btnDanger }} onClick={() => deleteTest(t.id)}>🗑 Удалить</button>
              </div>
            ))}
            {tests.length === 0 && !showCreate && !editingTest && <p style={{ color: "#888" }}>Тестов пока нет</p>}
          </div>
        )}

        {tab === "users" && (
          <div>
            <b>Пользователи ({users.length})</b>
            <div style={{ marginTop: 12 }}>
              {users.map(u => (
                <div key={u.id} style={{ ...S.card, ...S.row }}>
                  <span style={{ flex: 1 }}>
                    <b>#{u.id}</b> {u.username}
                    {" "}<span style={S.badge(u.role)}>{u.role}</span>
                  </span>
                  {u.role === "client"
                    ? <button style={{ ...S.btn, ...S.btnGray, fontSize: 12 }} onClick={() => changeRole(u.id, "admin")}>→ Сделать админом</button>
                    : <button style={{ ...S.btn, ...S.btnGray, fontSize: 12 }} onClick={() => changeRole(u.id, "client")}>→ Сделать клиентом</button>
                  }
                  <button style={{ ...S.btn, ...S.btnDanger }} onClick={() => deleteUser(u.id)}>🗑</button>
                </div>
              ))}
              {users.length === 0 && <p style={{ color: "#888" }}>Пользователей нет</p>}
            </div>
          </div>
        )}

        {tab === "results" && (
          <div>
            <b>Результаты ({results.length})</b>
            <div style={{ marginTop: 12 }}>
              {results.map((r) => (
                <div key={r.id} style={{ ...S.card, ...S.row }}>
                  <span style={{ flex: 1, fontSize: 14 }}>
                    👤 Пользователь <b>#{r.user_id}</b> &nbsp;|&nbsp;
                    Тест <b>#{r.test_id}</b> &nbsp;|&nbsp;
                    Баллов: <b>{r.score}</b>
                  </span>
                  <button style={{ ...S.btn, ...S.btnDanger }} onClick={() => deleteResult(r.id)}>🗑</button>
                </div>
              ))}
              {results.length === 0 && <p style={{ color: "#888" }}>Результатов пока нет</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
