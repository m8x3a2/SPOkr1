import React, { useState, useEffect, useCallback } from "react"


const truncate = (str, maxLen = 50) =>
  str && str.length > maxLen ? str.slice(0, maxLen) + "…" : str

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

function Pagination({ page, pages, total, pageSize, onPage }) {
  if (pages <= 1) return <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>Всего: {total}</div>
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const btnS = (active) => ({
    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14,
    background: active ? "#4f46e5" : "#e5e7eb", color: active ? "#fff" : "#333",
    fontWeight: active ? "bold" : "normal"
  })
  const visiblePages = Array.from({ length: pages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === pages || Math.abs(p - page) <= 2)
    .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i - 1] > 1) acc.push("..."); acc.push(p); return acc }, [])
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
      <button style={btnS(false)} disabled={page <= 1} onClick={() => onPage(1)}>«</button>
      <button style={btnS(false)} disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
      {visiblePages.map((p, i) => p === "..." ? (
        <span key={`d${i}`} style={{ color: "#888" }}>…</span>
      ) : (
        <button key={p} style={btnS(p === page)} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button style={btnS(false)} disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
      <button style={btnS(false)} disabled={page >= pages} onClick={() => onPage(pages)}>»</button>
      <span style={{ fontSize: 13, color: "#888", marginLeft: 4 }}>{from}–{to} из {total}</span>
    </div>
  )
}

function parseTagInput(raw) {
  return raw.split(",").map(t => t.replace(/^#/, "").trim().toLowerCase()).filter(Boolean)
}

// Красиво форматирует ошибки Pydantic 422 или строку
function parseApiError(d) {
  if (!d) return "Неизвестная ошибка"
  if (typeof d.detail === "string") return d.detail
  if (Array.isArray(d.detail)) {
    return d.detail.map(e => {
      const loc = e.loc?.slice(1).join(" → ") || ""
      const msg = e.msg?.replace("Value error, ", "") || ""
      return loc ? `${loc}: ${msg}` : msg
    }).join("; ")
  }
  return "Ошибка при сохранении"
}

const emptyQForm = () => ({
  text: "", question_type: "single",
  options: [{ text: "", is_correct: false }, { text: "", is_correct: false }]
})

function QuestionEditor({ q, onChange, onRemove, index }) {
  const updateOption = (i, field, value) =>
    onChange({ ...q, options: q.options.map((o, idx) => idx === i ? { ...o, [field]: value } : o) })
  const setSingleCorrect = (i) =>
    onChange({ ...q, options: q.options.map((o, idx) => ({ ...o, is_correct: idx === i })) })
  const addOption = () => {
    if (q.options.length >= 50) return
    onChange({ ...q, options: [...q.options, { text: "", is_correct: false }] })
  }
  const removeOption = (i) => {
    if (q.options.length <= 2) return
    onChange({ ...q, options: q.options.filter((_, idx) => idx !== i) })
  }
  return (
    <div style={{ ...S.card, border: "1px solid #c7d2fe", marginBottom: 10 }}>
      <div style={{ ...S.row, marginBottom: 6 }}>
        <b style={{ color: "#4f46e5", fontSize: 13 }}>Вопрос {index + 1}</b>
        <span style={{ flex: 1 }} />
        <select style={{ ...S.select, marginBottom: 0 }} value={q.question_type}
          onChange={e => onChange({ ...q, question_type: e.target.value })}>
          <option value="single">Один правильный</option>
          <option value="multi">Несколько правильных</option>
        </select>
        {onRemove && <button style={{ ...S.btn, ...S.btnDanger, padding: "4px 10px" }} onClick={onRemove}>✕</button>}
      </div>
      <input style={S.input} placeholder="Текст вопроса (макс. 200 символов)" value={q.text} maxLength={200}
        onChange={e => onChange({ ...q, text: e.target.value })} />
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
        {q.question_type === "single" ? "Отметьте один правильный ответ (●)" : "Отметьте все правильные ответы (☑)"}
        &nbsp;· Вариантов: {q.options.length} (мин. 2, макс. 50)
      </div>
      {q.options.map((opt, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
          {q.question_type === "single" ? (
            <input type="radio" name={`correct_${index}`} checked={opt.is_correct}
              onChange={() => setSingleCorrect(i)} style={{ cursor: "pointer", width: 16, height: 16, flexShrink: 0 }} />
          ) : (
            <input type="checkbox" checked={opt.is_correct}
              onChange={e => updateOption(i, "is_correct", e.target.checked)}
              style={{ cursor: "pointer", width: 16, height: 16, flexShrink: 0 }} />
          )}
          <input style={{ ...S.input, marginBottom: 0, flex: 1, wordBreak: "break-word", overflowWrap: "anywhere" }} placeholder={`Вариант ${i + 1} (макс. 200 символов)`}
            maxLength={200} value={opt.text} onChange={e => updateOption(i, "text", e.target.value)} />
          <button style={{ ...S.btn, ...S.btnDanger, padding: "3px 8px", flexShrink: 0 }}
            onClick={() => removeOption(i)} disabled={q.options.length <= 2} title="Удалить вариант">✕</button>
        </div>
      ))}
      <button style={{ ...S.btn, ...S.btnGray, fontSize: 12, marginTop: 4 }}
        onClick={addOption} disabled={q.options.length >= 50}>+ Добавить вариант</button>
    </div>
  )
}

function TestForm({ data, setter, onSubmit, onCancel, submitLabel, errorMsg }) {
  const [tagInput, setTagInput] = useState("")
  const addQuestion = () => {
    if (data.questions.length >= 100) return
    setter({ ...data, questions: [...data.questions, emptyQForm()] })
  }
  const updateQuestion = (i, updated) =>
    setter({ ...data, questions: data.questions.map((q, idx) => idx === i ? updated : q) })
  const removeQuestion = (i) =>
    setter({ ...data, questions: data.questions.filter((_, idx) => idx !== i) })
  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !data.tags.includes(t)) setter({ ...data, tags: [...data.tags, t] })
    setTagInput("")
  }
  const removeTag = (t) => setter({ ...data, tags: data.tags.filter(x => x !== t) })
  const isValid = data.title.trim() && data.questions.length > 0 &&
    data.questions.every(q => q.text.trim() && q.options.length >= 2 &&
      q.options.every(o => o.text.trim()) && q.options.some(o => o.is_correct))
  return (
    <div style={S.card}>
      <input style={S.input} placeholder="Название теста (макс. 100 символов)" value={data.title} maxLength={100}
        onChange={e => setter({ ...data, title: e.target.value })} />
      <div style={{ fontSize: 11, color: data.title.length > 90 ? "#ef4444" : "#aaa", marginTop: -6, marginBottom: 6, textAlign: "right" }}>{data.title.length}/100</div>
      {errorMsg && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "6px 12px", marginBottom: 8, color: "#991b1b", fontSize: 13 }}>
          ❌ {errorMsg}
        </div>
      )}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Теги</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {data.tags.map(t => (
            <span key={t} style={{ background: "#ede9fe", color: "#4f46e5", borderRadius: 12, padding: "2px 10px", fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
              #{t}<span style={{ cursor: "pointer", fontSize: 12 }} onClick={() => removeTag(t)}>✕</span>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input style={{ ...S.input, marginBottom: 0, flex: 1 }} placeholder="Добавить тег (макс. 40 символов)"
            value={tagInput} maxLength={40} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTag()} />
          <button style={{ ...S.btn, ...S.btnGray }} onClick={addTag}>+ Тег</button>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...S.row }}>
          <b style={{ fontSize: 14 }}>Вопросы ({data.questions.length})</b>
          <button style={{ ...S.btn, ...S.btnSuccess, fontSize: 13 }} onClick={addQuestion} disabled={data.questions.length >= 100} title={data.questions.length >= 100 ? "Максимум 100 вопросов" : ""}>+ Добавить вопрос</button>
        </div>
        {data.questions.map((q, i) => (
          <QuestionEditor key={i} index={i} q={q}
            onChange={(updated) => updateQuestion(i, updated)}
            onRemove={data.questions.length > 1 ? () => removeQuestion(i) : null} />
        ))}
      </div>
      <div style={S.row}>
        <button style={{ ...S.btn, ...S.btnPrimary }} disabled={!isValid} onClick={onSubmit}>{submitLabel}</button>
        <button style={{ ...S.btn, ...S.btnGray }} onClick={onCancel}>Отмена</button>
        {!isValid && data.questions.length > 0 && (
          <span style={{ fontSize: 12, color: "#f59e0b" }}>⚠ Заполните все вопросы и отметьте правильные ответы</span>
        )}
      </div>
    </div>
  )
}

const emptyTest = () => ({ title: "", questions: [emptyQForm()], tags: [] })

export default function Admin({ API, token }) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  const [tab, setTab] = useState("tests")

  // Tests
  const [tests, setTests] = useState([])
  const [testsTotal, setTestsTotal] = useState(0)
  const [testsPage, setTestsPage] = useState(1)
  const [testsPages, setTestsPages] = useState(1)
  const [testsSearch, setTestsSearch] = useState("")
  const [testsTagRaw, setTestsTagRaw] = useState("")   // строка "#матан, #линал"
  const [editingTest, setEditingTest] = useState(null)
  const [newTest, setNewTest] = useState(emptyTest())
  const [showCreate, setShowCreate] = useState(false)
  const [formError, setFormError] = useState("")

  // Users
  const [users, setUsers] = useState([])

  // Results
  const [results, setResults] = useState([])
  const [resultsTotal, setResultsTotal] = useState(0)
  const [resultsPage, setResultsPage] = useState(1)
  const [resultsPages, setResultsPages] = useState(1)

  const [msg, setMsg] = useState("")

  const loadTests = (page = 1, search = testsSearch, tagRaw = testsTagRaw) => {
    const params = new URLSearchParams({ page })
    if (search) params.set("search", search)
    const tags = parseTagInput(tagRaw)
    if (tags.length > 0) params.set("tags", tags.join(","))
    fetch(`${API}/admin/tests-list?${params}`, { headers })
      .then(r => r.json())
      .then(d => {
        setTests(d.items || [])
        setTestsTotal(d.total || 0)
        setTestsPage(d.page || 1)
        setTestsPages(d.pages || 1)
      })
  }

  const loadUsers = () =>
    fetch(`${API}/admin/users`, { headers }).then(r => r.json()).then(setUsers)

  const loadResults = (page = 1) =>
    fetch(`${API}/admin/results?page=${page}`, { headers }).then(r => r.json()).then(d => {
      setResults(d.items || [])
      setResultsTotal(d.total || 0)
      setResultsPage(d.page || 1)
      setResultsPages(d.pages || 1)
    })

  useEffect(() => { loadTests(1); loadUsers(); loadResults(1) }, [])

  useEffect(() => {
    const timer = setTimeout(() => loadTests(1, testsSearch, testsTagRaw), 300)
    return () => clearTimeout(timer)
  }, [testsSearch, testsTagRaw])

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(""), 2500) }

  const createTest = async () => {
    setFormError("")
    const res = await fetch(`${API}/admin/tests`, { method: "POST", headers, body: JSON.stringify(newTest) })
    if (!res.ok) {
      const d = await res.json()
      setFormError(parseApiError(d))
      return
    }
    setNewTest(emptyTest()); setShowCreate(false)
    loadTests(testsPage); flash("✅ Тест создан!")
  }

  const deleteAllTests = async () => {
    if (!confirm(`Удалить ВСЕ тесты? Это действие необратимо.`)) return
    if (!confirm("Вы уверены? Все тесты будут удалены навсегда.")) return
    const res = await fetch(`${API}/admin/tests-all`, { method: "DELETE", headers })
    const d = await res.json()
    loadTests(1); flash(`🗑 Удалено тестов: ${d.deleted}`)
  }

  const exportTests = async () => {
    const res = await fetch(`${API}/admin/tests-export`, { headers })
    const data = await res.json()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tests_export_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash(`✅ Экспортировано тестов: ${data.length}`)
  }

  const importRef = React.useRef()

  const importTests = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ""
    let parsed
    try { parsed = JSON.parse(await file.text()) } catch {
      flash("❌ Ошибка: не удалось прочитать JSON файл"); return
    }
    if (!Array.isArray(parsed)) {
      flash("❌ Ошибка: JSON должен содержать массив тестов"); return
    }
    const res = await fetch(`${API}/admin/tests-import?skip_duplicates=true`, {
      method: "POST", headers, body: JSON.stringify(parsed)
    })
    if (!res.ok) {
      const d = await res.json()
      flash(`❌ ${d.detail || "Ошибка импорта"}`); return
    }
    const d = await res.json()
    loadTests(1)
    flash(`✅ Импортировано: ${d.imported}, пропущено (дубли): ${d.skipped}`)
  }



  const startEdit = async (id) => {
    setFormError("")
    const res = await fetch(`${API}/admin/tests/${id}`, { headers })
    const data = await res.json()
    setEditingTest({
      id: data.id, title: data.title, tags: data.tags.map(t => t.name),
      questions: data.questions.map(q => ({
        text: q.text, question_type: q.question_type || "single",
        options: q.options.sort((a, b) => a.order - b.order).map(o => ({ text: o.text, is_correct: o.is_correct }))
      }))
    })
  }

  const saveEdit = async () => {
    setFormError("")
    const res = await fetch(`${API}/admin/tests/${editingTest.id}`, {
      method: "PUT", headers,
      body: JSON.stringify({ title: editingTest.title, questions: editingTest.questions, tags: editingTest.tags })
    })
    if (!res.ok) {
      const d = await res.json()
      setFormError(parseApiError(d))
      return
    }
    setEditingTest(null); loadTests(testsPage); flash("✅ Тест обновлён!")
  }

  const deleteTest = async (id) => {
    if (!confirm("Удалить тест?")) return
    await fetch(`${API}/admin/tests/${id}`, { method: "DELETE", headers })
    loadTests(testsPage); flash("🗑 Тест удалён")
  }

  const changeRole = async (userId, role) => {
    await fetch(`${API}/admin/users/${userId}/role`, { method: "PUT", headers, body: JSON.stringify({ role }) })
    loadUsers(); flash(`✅ Роль изменена на ${role}`)
  }

  const deleteUser = async (id) => {
    if (!confirm("Удалить пользователя и все его результаты?")) return
    await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers })
    loadUsers(); flash("🗑 Пользователь удалён")
  }

  const deleteResult = async (id) => {
    await fetch(`${API}/admin/results/${id}`, { method: "DELETE", headers })
    loadResults(resultsPage); flash("🗑 Результат удалён")
  }

  // Активные теги из строки (для отображения плашек)
  const activeAdminTags = parseTagInput(testsTagRaw)

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

        {/* ===== ТЕСТЫ ===== */}
        {tab === "tests" && (
          <div>
            <div style={{ ...S.row, marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
              <b>Тесты ({testsTotal})</b>
              <span style={{ flex: 1 }} />
              {!showCreate && !editingTest && (
                <>
                  {/* Скрытый input для импорта */}
                  <input type="file" accept=".json" style={{ display: "none" }} ref={importRef} onChange={importTests} />
                  <button style={{ ...S.btn, background: "#0ea5e9", color: "#fff" }} onClick={() => importRef.current.click()} title="Импортировать тесты из JSON файла">
                    📥 Импорт
                  </button>
                  <button style={{ ...S.btn, background: "#6366f1", color: "#fff" }} onClick={exportTests} title="Экспортировать все тесты в JSON файл">
                    📤 Экспорт
                  </button>
                  <button style={{ ...S.btn, ...S.btnDanger }} onClick={deleteAllTests} title="Удалить все тесты">
                    🗑 Удалить все
                  </button>
                  <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => { setShowCreate(true); setFormError("") }}>
                    + Создать тест
                  </button>
                </>
              )}
            </div>

            {/* Поиск — только когда не в режиме создания/редактирования */}
            {!showCreate && !editingTest && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", flex: 2, minWidth: 160 }}
                    placeholder="🔍 Поиск по названию..."
                    value={testsSearch} onChange={e => setTestsSearch(e.target.value)} />
                  <input
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", flex: 2, minWidth: 160 }}
                    placeholder="🏷 Теги: #матан, #линал"
                    value={testsTagRaw} onChange={e => setTestsTagRaw(e.target.value)} />
                  {(testsSearch || testsTagRaw) && (
                    <button style={{ ...S.btn, ...S.btnGray }} onClick={() => { setTestsSearch(""); setTestsTagRaw("") }}>✕</button>
                  )}
                </div>
                {activeAdminTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: "#555", alignSelf: "center" }}>Фильтр:</span>
                    {activeAdminTags.map(t => (
                      <span key={t} style={{ background: "#4f46e5", color: "#fff", borderRadius: 12, padding: "3px 10px", fontSize: 13 }}>#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showCreate && (
              <>
                <b style={{ color: "#4f46e5" }}>➕ Новый тест</b>
                <TestForm data={newTest} setter={setNewTest} errorMsg={formError}
                  submitLabel="Создать тест" onSubmit={createTest}
                  onCancel={() => { setShowCreate(false); setNewTest(emptyTest()); setFormError("") }} />
              </>
            )}

            {editingTest && (
              <>
                <b style={{ color: "#4f46e5" }}>✏️ Редактирование теста #{editingTest.id}</b>
                <TestForm data={editingTest} setter={setEditingTest} errorMsg={formError}
                  submitLabel="Сохранить" onSubmit={saveEdit}
                  onCancel={() => { setEditingTest(null); setFormError("") }} />
              </>
            )}

            {!showCreate && !editingTest && (
              <>
                {tests.map(t => (
                  <div key={t.id} style={{ ...S.card, ...S.row }}>
                    <span style={{ flex: 1 }}>
                      <b>#{t.id}</b> <span title={t.title}>{truncate(t.title)}</span>
                      {t.tags?.length > 0 && (
                        <span style={{ marginLeft: 8 }}>
                          {t.tags.map(tag => (
                            <span key={tag.id} style={{ background: "#ede9fe", color: "#4f46e5", borderRadius: 10, padding: "1px 7px", fontSize: 12, marginRight: 4 }}>
                              #{tag.name}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                    <button style={{ ...S.btn, ...S.btnGray }} onClick={() => startEdit(t.id)}>✏️ Изменить</button>
                    <button style={{ ...S.btn, ...S.btnDanger }} onClick={() => deleteTest(t.id)}>🗑 Удалить</button>
                  </div>
                ))}
                {tests.length === 0 && <p style={{ color: "#888" }}>Тестов не найдено</p>}
                <Pagination page={testsPage} pages={testsPages} total={testsTotal} pageSize={20}
                  onPage={p => { setTestsPage(p); loadTests(p) }} />
              </>
            )}
          </div>
        )}

        {/* ===== ПОЛЬЗОВАТЕЛИ ===== */}
        {tab === "users" && (
          <div>
            <b>Пользователи ({users.length})</b>
            <div style={{ marginTop: 12 }}>
              {users.map(u => (
                <div key={u.id} style={{ ...S.card, ...S.row }}>
                  <span style={{ flex: 1 }}><b>#{u.id}</b> {u.username}{" "}<span style={S.badge(u.role)}>{u.role}</span></span>
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

        {/* ===== РЕЗУЛЬТАТЫ ===== */}
        {tab === "results" && (
          <div>
            <b>Результаты ({resultsTotal})</b>
            <div style={{ marginTop: 12 }}>
              {results.map(r => (
                <div key={r.id} style={{ ...S.card, ...S.row }}>
                  <span style={{ flex: 1, fontSize: 14 }}>
                    👤 <b>#{r.user_id}</b> &nbsp;|&nbsp;
                    📋 <span title={r.test_title_snapshot}>{truncate(r.test_title_snapshot || `Тест #${r.test_id}`)}</span> &nbsp;|&nbsp;
                    <b>{r.score}/{r.total_questions_snapshot ?? "?"}</b>
                  </span>
                  <button style={{ ...S.btn, ...S.btnDanger }} onClick={() => deleteResult(r.id)}>🗑</button>
                </div>
              ))}
              {results.length === 0 && <p style={{ color: "#888" }}>Результатов пока нет</p>}
              <Pagination page={resultsPage} pages={resultsPages} total={resultsTotal} pageSize={50}
                onPage={p => loadResults(p)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
