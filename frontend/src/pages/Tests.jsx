import React, { useState, useEffect } from "react"


// Обрезать длинную строку до maxLen символов
const truncate = (str, maxLen = 50) =>
  str && str.length > maxLen ? str.slice(0, maxLen) + "…" : str

const S = {
  card: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, padding: 16, marginBottom: 12 },
  btn: { padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14 },
  btnPrimary: { background: "#4f46e5", color: "#fff" },
  btnGray: { background: "#e5e7eb", color: "#333" },
  tab: (active) => ({
    padding: "8px 18px", borderRadius: "6px 6px 0 0", border: "none", cursor: "pointer",
    background: active ? "#4f46e5" : "#e5e7eb",
    color: active ? "#fff" : "#333"
  })
}

function resultStyle(score, total) {
  const pct = total > 0 ? score / total : 0
  if (pct === 1) return { bg: "#f0fdf4", border: "#86efac", text: "#166534", emoji: "🎉" }
  if (pct > 0) return { bg: "#fefce8", border: "#fde047", text: "#854d0e", emoji: "📝" }
  return { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", emoji: "😔" }
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

// Парсит строку вида "#матан, #линал, физика" -> ["матан", "линал", "физика"]
function parseTagInput(raw) {
  return raw.split(",")
    .map(t => t.replace(/^#/, "").trim().toLowerCase())
    .filter(Boolean)
}

// Вкладка поиска по тегам
function TagsTab({ allTags, activeTags, onToggleTag }) {
  const [tagSearch, setTagSearch] = useState("")
  const filtered = allTags.filter(t => !tagSearch || t.name.includes(tagSearch.toLowerCase()))
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Теги</h3>
      <input
        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", width: "100%", marginBottom: 14, boxSizing: "border-box" }}
        placeholder="🔍 Найти тег..."
        value={tagSearch}
        onChange={e => setTagSearch(e.target.value)}
      />
      {activeTags.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>Активные теги:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {activeTags.map(t => (
              <span key={t} onClick={() => onToggleTag(t)} style={{
                background: "#4f46e5", color: "#fff", borderRadius: 12,
                padding: "4px 12px", fontSize: 13, cursor: "pointer", userSelect: "none"
              }}>#{t} ✕</span>
            ))}
          </div>
        </div>
      )}
      {filtered.length === 0 && <p style={{ color: "#888" }}>Тегов не найдено</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {filtered.map(t => {
          const active = activeTags.includes(t.name)
          return (
            <span key={t.id} onClick={() => onToggleTag(t.name)} style={{
              background: active ? "#4f46e5" : "#ede9fe",
              color: active ? "#fff" : "#4f46e5",
              borderRadius: 12, padding: "6px 14px", fontSize: 14,
              cursor: "pointer", userSelect: "none",
              border: `2px solid ${active ? "#4f46e5" : "#c4b5fd"}`
            }}>
              #{t.name}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export default function Tests({ API, token, user }) {
  const [tests, setTests] = useState([])
  const [testsTotal, setTestsTotal] = useState(0)
  const [testsPage, setTestsPage] = useState(1)
  const [testsPages, setTestsPages] = useState(1)
  const [allTags, setAllTags] = useState([])

  // Поиск по названию (строка) и по тегам (массив)
  const [search, setSearch] = useState("")
  const [activeTags, setActiveTags] = useState([])       // теги из вкладки Теги
  const [tagInputRaw, setTagInputRaw] = useState("")     // строка "#матан, #линал"

  const [activeTest, setActiveTest] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [unanswered, setUnanswered] = useState([])

  const [myResults, setMyResults] = useState([])
  const [resultsTotal, setResultsTotal] = useState(0)
  const [resultsPage, setResultsPage] = useState(1)
  const [resultsPages, setResultsPages] = useState(1)
  const [stats, setStats] = useState(null)
  const [tab, setTab] = useState("list")

  // Объединяем теги из обоих источников: вкладка + строка ввода
  const combinedTags = () => {
    const fromInput = parseTagInput(tagInputRaw)
    const all = [...new Set([...activeTags, ...fromInput])]
    return all
  }

  const loadTests = (page = 1, s = search, tags = null) => {
    const resolvedTags = tags ?? combinedTags()
    const params = new URLSearchParams({ page })
    if (s) params.set("search", s)
    if (resolvedTags.length > 0) params.set("tags", resolvedTags.join(","))
    fetch(`${API}/tests?${params}`).then(r => r.json()).then(d => {
      setTests(d.items || [])
      setTestsTotal(d.total || 0)
      setTestsPage(d.page || 1)
      setTestsPages(d.pages || 1)
    })
  }

  useEffect(() => { fetch(`${API}/tags`).then(r => r.json()).then(setAllTags) }, [])

  // Перезагружаем при смене поиска (debounce 300ms)
  useEffect(() => {
    const timer = setTimeout(() => loadTests(1, search, combinedTags()), 300)
    return () => clearTimeout(timer)
  }, [search, tagInputRaw, activeTags])

  const toggleTag = (name) => {
    setActiveTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name])
  }

  const loadMyResults = (page = 1) => {
    if (!token) return
    fetch(`${API}/my-results?page=${page}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setMyResults(d.items || [])
        setResultsTotal(d.total || 0)
        setResultsPage(d.page || 1)
        setResultsPages(d.pages || 1)
      })
  }
  const loadStats = () => {
    if (!token) return
    fetch(`${API}/my-stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setStats)
  }
  useEffect(() => { if (tab === "results") { loadMyResults(1); loadStats() } }, [tab])

  const openTest = async (id) => {
    const res = await fetch(`${API}/tests/${id}`)
    const data = await res.json()
    setActiveTest(data); setAnswers({}); setResult(null); setUnanswered([]); setShowReview(false)
  }

  const setAnswer = (questionId, optionId, type) => {
    if (type === "single") {
      setAnswers(prev => ({ ...prev, [questionId]: optionId }))
    } else {
      setAnswers(prev => {
        const cur = prev[questionId] instanceof Set ? prev[questionId] : new Set()
        const next = new Set(cur)
        next.has(optionId) ? next.delete(optionId) : next.add(optionId)
        return { ...prev, [questionId]: next }
      })
    }
  }
  const isOptionSelected = (qid, oid, type) => {
    if (type === "single") return answers[qid] === oid
    const a = answers[qid]; return a instanceof Set ? a.has(oid) : false
  }
  const calcGuestScore = () => {
    let score = 0
    for (const q of activeTest.questions) {
      const correctIds = new Set(q.options.filter(o => o.is_correct).map(o => o.id))
      if (q.question_type === "single") { if (correctIds.has(answers[q.id])) score++ }
      else {
        const us = answers[q.id] instanceof Set ? answers[q.id] : new Set()
        if (us.size === correctIds.size && [...us].every(id => correctIds.has(id))) score++
      }
    }
    return score
  }
  const submit = async () => {
    const missing = activeTest.questions.filter(q => {
      if (q.question_type === "single") return !answers[q.id]
      const a = answers[q.id]; return !(a instanceof Set && a.size > 0)
    }).map(q => q.id)
    if (missing.length > 0) { setUnanswered(missing); return }
    setUnanswered([])
    if (user) {
      const serialized = {}
      for (const [qId, ans] of Object.entries(answers))
        serialized[qId] = ans instanceof Set ? [...ans].map(String) : String(ans)
      const res = await fetch(`${API}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ test_id: activeTest.id, answers: serialized })
      })
      if (!res.ok) {
        alert("Ошибка при отправке ответов. Попробуйте ещё раз.")
        return
      }
      const data = await res.json()
      setResult({ score: data.score, total: activeTest.questions.length })
    } else {
      setResult({ score: calcGuestScore(), total: activeTest.questions.length, guest: true })
    }
  }

  // ===== Прохождение теста =====
  if (activeTest) {
    const pct = result ? Math.round(result.score / result.total * 100) : null
    const rs = result ? resultStyle(result.score, result.total) : null

    // Проверяем правильность ответа на вопрос (для показа разбора)
    const isQuestionCorrect = (q) => {
      const correctIds = new Set(q.options.filter(o => o.is_correct).map(o => o.id))
      if (q.question_type === "single") {
        return correctIds.has(answers[q.id])
      } else {
        const us = answers[q.id] instanceof Set ? answers[q.id] : new Set()
        return us.size === correctIds.size && [...us].every(id => correctIds.has(id))
      }
    }

    return (
      <div>
        <button style={{ ...S.btn, ...S.btnGray, marginBottom: 16 }} onClick={() => setActiveTest(null)}>← Назад</button>
        <h2 style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{activeTest.title}</h2>
        {activeTest.tags?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {activeTest.tags.map(t => (
              <span key={t.id} style={{ background: "#ede9fe", color: "#4f46e5", borderRadius: 10, padding: "2px 9px", fontSize: 13, marginRight: 6 }}>#{t.name}</span>
            ))}
          </div>
        )}
        {unanswered.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 14px", marginBottom: 12, color: "#991b1b", fontSize: 14 }}>
            ⚠ Ответьте на все вопросы перед отправкой (отмечены красной рамкой)
          </div>
        )}

        {/* Вопросы во время прохождения */}
        {!result && activeTest.questions.map((q, idx) => {
          const isUnanswered = unanswered.includes(q.id)
          return (
            <div key={q.id} style={{ ...S.card, border: isUnanswered ? "2px solid #ef4444" : "1px solid #e0e0e0" }}>
              <b style={{ fontSize: 15, wordBreak: "break-word", overflowWrap: "anywhere" }}>{idx + 1}. {q.text}</b>
              {q.question_type === "multi" && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>(можно выбрать несколько)</div>}
              <div style={{ marginTop: 10 }}>
                {q.options.sort((a, b) => a.order - b.order).map(opt => {
                  const selected = isOptionSelected(q.id, opt.id, q.question_type)
                  return (
                    <label key={opt.id} style={{
                      display: "flex", alignItems: "flex-start", padding: "8px 12px", marginBottom: 6, borderRadius: 6,
                      cursor: "pointer",
                      background: selected ? "#ede9fe" : "#f9fafb",
                      border: selected ? "2px solid #4f46e5" : "2px solid transparent",
                    }}>
                      <input type={q.question_type === "single" ? "radio" : "checkbox"}
                        name={`q${q.id}`} style={{ marginRight: 8, marginTop: 3, flexShrink: 0 }} checked={selected}
                        onChange={() => setAnswer(q.id, opt.id, q.question_type)} />
                      <span style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{opt.text}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Результат */}
        {result && (
          <>
            <div style={{ background: rs.bg, border: `2px solid ${rs.border}`, borderRadius: 10, padding: 20, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36 }}>{rs.emoji}</div>
              <div style={{ fontSize: 22, fontWeight: "bold", color: rs.text, marginTop: 4 }}>
                {result.score} из {result.total} — {pct}%
              </div>
              {result.guest && <div style={{ marginTop: 8, fontSize: 13, color: "#888" }}>Вы не авторизованы — результат не сохранён.</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
                <button style={{ ...S.btn, ...S.btnGray }} onClick={() => setActiveTest(null)}>← К списку тестов</button>
                <button
                  style={{ ...S.btn, background: showReview ? "#6366f1" : "#e0e7ff", color: showReview ? "#fff" : "#4f46e5" }}
                  onClick={() => setShowReview(r => !r)}
                >
                  {showReview ? "▲ Скрыть разбор" : "▼ Показать разбор"}
                </button>
              </div>
            </div>

            {/* Разбор ответов */}
            {showReview && activeTest.questions.map((q, idx) => {
              const correct = isQuestionCorrect(q)
              const correctIds = new Set(q.options.filter(o => o.is_correct).map(o => o.id))
              return (
                <div key={q.id} style={{
                  ...S.card,
                  borderLeft: `4px solid ${correct ? "#22c55e" : "#ef4444"}`,
                  marginBottom: 10
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{correct ? "✅" : "❌"}</span>
                    <b style={{ fontSize: 15, wordBreak: "break-word", overflowWrap: "anywhere" }}>{idx + 1}. {q.text}</b>
                  </div>
                  <div>
                    {q.options.sort((a, b) => a.order - b.order).map(opt => {
                      const userPicked = isOptionSelected(q.id, opt.id, q.question_type)
                      const isCorrect = correctIds.has(opt.id)

                      // Определяем цвет варианта
                      let bg = "#f9fafb", border = "2px solid transparent", textColor = "#333"
                      if (isCorrect) {
                        bg = "#f0fdf4"; border = "2px solid #22c55e"; textColor = "#166534"
                      } else if (userPicked && !isCorrect) {
                        bg = "#fef2f2"; border = "2px solid #ef4444"; textColor = "#991b1b"
                      }

                      return (
                        <div key={opt.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "7px 12px", marginBottom: 5, borderRadius: 6,
                          background: bg, border, color: textColor
                        }}>
                          <span style={{ width: 18, textAlign: "center", flexShrink: 0, fontSize: 14 }}>
                            {isCorrect ? "✓" : (userPicked ? "✗" : "")}
                          </span>
                          <span style={{ flex: 1, fontSize: 14, wordBreak: "break-word", overflowWrap: "anywhere" }}>{opt.text}</span>
                          {isCorrect && !userPicked && (
                            <span style={{ fontSize: 12, color: "#16a34a", fontStyle: "italic" }}>правильный</span>
                          )}
                          {userPicked && !isCorrect && (
                            <span style={{ fontSize: 12, color: "#dc2626", fontStyle: "italic" }}>ваш ответ</span>
                          )}
                          {userPicked && isCorrect && (
                            <span style={{ fontSize: 12, color: "#16a34a", fontStyle: "italic" }}>ваш ответ ✓</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {!result && (
          <button style={{ ...S.btn, ...S.btnPrimary, width: "100%", padding: "10px", marginTop: 4 }} onClick={submit}>
            Отправить ответы
          </button>
        )}
      </div>
    )
  }

  // ===== Список тестов / История / Теги =====
  const hasTagFilter = activeTags.length > 0 || parseTagInput(tagInputRaw).length > 0
  const allActiveTags = combinedTags()

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 0, flexWrap: "wrap" }}>
        <button style={S.tab(tab === "list")} onClick={() => setTab("list")}>📝 Тесты</button>
        <button style={S.tab(tab === "tags")} onClick={() => setTab("tags")}>
          🏷 Теги{activeTags.length > 0 ? ` (${activeTags.length})` : ""}
        </button>
        {user && (
          <button style={S.tab(tab === "results")} onClick={() => setTab("results")}>📊 История и статистика</button>
        )}
      </div>

      <div style={{ border: "1px solid #e0e0e0", borderRadius: "0 8px 8px 8px", padding: 16 }}>

        {/* ===== ВКЛАДКА ТЕГИ ===== */}
        {tab === "tags" && (
          <TagsTab allTags={allTags} activeTags={activeTags} onToggleTag={toggleTag} />
        )}

        {/* ===== ВКЛАДКА ТЕСТЫ ===== */}
        {tab === "list" && (
          <>
            <h3 style={{ marginTop: 0 }}>Список тестов</h3>

            {/* Строка поиска */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <input
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", flex: 2, minWidth: 160 }}
                placeholder="🔍 Поиск по названию..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <input
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", flex: 2, minWidth: 160 }}
                placeholder="🏷 Теги: #матан, #линал"
                value={tagInputRaw} onChange={e => setTagInputRaw(e.target.value)} />
              {(search || tagInputRaw || activeTags.length > 0) && (
                <button style={{ ...S.btn, ...S.btnGray }} onClick={() => { setSearch(""); setTagInputRaw(""); setActiveTags([]) }}>
                  ✕ Сбросить
                </button>
              )}
            </div>

            {/* Активные теги (из вкладки или из строки) */}
            {allActiveTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: "#555", alignSelf: "center" }}>Фильтр:</span>
                {allActiveTags.map(t => (
                  <span key={t} onClick={() => {
                    // Убираем из activeTags если там есть, иначе просто показываем
                    setActiveTags(prev => prev.filter(x => x !== t))
                    setTagInputRaw(prev => {
                      const tags = parseTagInput(prev).filter(x => x !== t)
                      return tags.map(x => "#" + x).join(", ")
                    })
                  }} style={{
                    background: "#4f46e5", color: "#fff", borderRadius: 12,
                    padding: "3px 10px", fontSize: 13, cursor: "pointer"
                  }}>#{t} ✕</span>
                ))}
              </div>
            )}

            {!user && (
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 13, color: "#0369a1" }}>
                💡 Вы не авторизованы — тесты можно проходить, но результаты не сохранятся.
              </div>
            )}
            {tests.length === 0 && <p style={{ color: "#888" }}>Тестов не найдено</p>}
            {tests.map(t => (
              <div key={t.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 16 }}>📋 <b title={t.title}>{truncate(t.title)}</b></span>
                  {t.tags?.length > 0 && (
                    <span style={{ marginLeft: 8 }}>
                      {t.tags.map(tag => (
                        <span key={tag.id} style={{ background: "#ede9fe", color: "#4f46e5", borderRadius: 10, padding: "1px 7px", fontSize: 12, marginRight: 4 }}>#{tag.name}</span>
                      ))}
                    </span>
                  )}
                </span>
                <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => openTest(t.id)}>Пройти →</button>
              </div>
            ))}
            <Pagination page={testsPage} pages={testsPages} total={testsTotal} pageSize={20}
              onPage={p => loadTests(p)} />
          </>
        )}

        {/* ===== ВКЛАДКА ИСТОРИЯ ===== */}
        {tab === "results" && (
          <>
            {stats && (
              <div style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <b style={{ fontSize: 15, color: "#4f46e5" }}>📈 Общая статистика</b>
                <div style={{ display: "flex", gap: 24, marginTop: 10, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#4f46e5" }}>{stats.total_tests}</div>
                    <div style={{ fontSize: 13, color: "#666" }}>тестов пройдено</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: "#4f46e5" }}>{stats.total_correct}/{stats.total_questions}</div>
                    <div style={{ fontSize: 13, color: "#666" }}>правильных ответов</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28, fontWeight: "bold", color: stats.avg_pct >= 70 ? "#16a34a" : stats.avg_pct >= 40 ? "#d97706" : "#dc2626" }}>
                      {stats.avg_pct}%
                    </div>
                    <div style={{ fontSize: 13, color: "#666" }}>средний результат</div>
                  </div>
                </div>
              </div>
            )}
            <h3 style={{ marginTop: 0 }}>История прохождений</h3>
            {myResults.length === 0 && <p style={{ color: "#888" }}>Вы ещё не проходили тесты</p>}
            {myResults.map((r, i) => {
              const total = r.total_questions_snapshot ?? 0
              const pct = total > 0 ? Math.round(r.score / total * 100) : 0
              const rs = resultStyle(r.score, total)
              return (
                <div key={r.id || i} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, borderLeft: `4px solid ${rs.border}` }}>
                  <span style={{ flex: 1, fontSize: 14 }} title={r.test_title_snapshot}>{rs.emoji} <b>{truncate(r.test_title_snapshot || `Тест #${r.test_id}`)}</b></span>
                  <span style={{ padding: "4px 12px", borderRadius: 12, fontWeight: "bold", background: rs.bg, color: rs.text, fontSize: 15 }}>
                    {r.score}/{total}
                  </span>
                  <span style={{ fontSize: 13, color: "#888", minWidth: 40, textAlign: "right" }}>{pct}%</span>
                </div>
              )
            })}
            <Pagination page={resultsPage} pages={resultsPages} total={resultsTotal} pageSize={100}
              onPage={p => loadMyResults(p)} />
          </>
        )}
      </div>
    </div>
  )
}
