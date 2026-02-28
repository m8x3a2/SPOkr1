import React, { useState, useEffect } from "react"

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

// Цвет результата зависит от процента: 100% — зелёный, >0% — жёлтый, 0% — красный
function resultStyle(score, total) {
  const pct = total > 0 ? score / total : 0
  if (pct === 1)   return { bg: "#f0fdf4", border: "#86efac", text: "#166534", emoji: "🎉" }
  if (pct > 0)     return { bg: "#fefce8", border: "#fde047", text: "#854d0e", emoji: "📝" }
  return             { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", emoji: "😔" }
}

// Подсчёт результата локально (для гостя — без сохранения в базу)
function calcScore(questions, answers) {
  return questions.reduce((acc, q) => acc + (answers[q.id] === q.correct ? 1 : 0), 0)
}

export default function Tests({ API, token, user }) {
  const [tests, setTests] = useState([])
  const [activeTest, setActiveTest] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [myResults, setMyResults] = useState([])
  const [testTitles, setTestTitles] = useState({})  // id -> title для истории
  const [tab, setTab] = useState("list")

  useEffect(() => {
    fetch(`${API}/tests`).then(r => r.json()).then(data => {
      setTests(data)
      // Сохраняем названия тестов для вкладки истории
      const titles = {}
      data.forEach(t => { titles[t.id] = t.title })
      setTestTitles(titles)
    })
  }, [])

  const loadMyResults = () => {
    if (!token) return
    fetch(`${API}/my-results`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        // Сортируем: последний результат сверху
        setMyResults([...data].reverse())
      })
  }

  useEffect(() => { if (tab === "results") loadMyResults() }, [tab])

  const openTest = async (id) => {
    const res = await fetch(`${API}/tests/${id}`)
    const data = await res.json()
    setActiveTest(data)
    setAnswers({})
    setResult(null)
  }

  const submit = async () => {
    if (user) {
      // Авторизованный — сохраняем в базу
      const res = await fetch(`${API}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ test_id: activeTest.id, answers })
      })
      const data = await res.json()
      setResult({ score: data.score, total: activeTest.questions.length })
    } else {
      // Гость — считаем локально, не сохраняем
      const score = calcScore(activeTest.questions, answers)
      setResult({ score, total: activeTest.questions.length, guest: true })
    }
  }

  if (activeTest) {
    const pct = result ? Math.round(result.score / result.total * 100) : null
    const rs = result ? resultStyle(result.score, result.total) : null

    return (
      <div>
        <button style={{ ...S.btn, ...S.btnGray, marginBottom: 16 }} onClick={() => setActiveTest(null)}>
          ← Назад
        </button>
        <h2>{activeTest.title}</h2>

        {activeTest.questions.map((q, idx) => (
          <div key={q.id} style={S.card}>
            <b style={{ fontSize: 15 }}>{idx + 1}. {q.text}</b>
            <div style={{ marginTop: 10 }}>
              {["a", "b", "c", "d"].map(opt => (
                <label key={opt} style={{
                  display: "block", padding: "8px 12px", marginBottom: 6, borderRadius: 6,
                  cursor: result ? "default" : "pointer",
                  background: answers[q.id] === opt ? "#ede9fe" : "#f9fafb",
                  border: answers[q.id] === opt ? "2px solid #4f46e5" : "2px solid transparent",
                  opacity: result ? 0.85 : 1
                }}>
                  <input
                    type="radio" name={`q${q.id}`} value={opt}
                    style={{ marginRight: 8 }}
                    checked={answers[q.id] === opt}
                    disabled={!!result}
                    onChange={() => !result && setAnswers({ ...answers, [q.id]: opt })}
                  />
                  <b>{opt.toUpperCase()}.</b> {q[`option_${opt}`]}
                </label>
              ))}
            </div>
          </div>
        ))}

        {result ? (
          <div style={{
            background: rs.bg, border: `2px solid ${rs.border}`,
            borderRadius: 10, padding: 20, textAlign: "center", marginTop: 8
          }}>
            <div style={{ fontSize: 36 }}>{rs.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: "bold", color: rs.text, marginTop: 4 }}>
              {result.score} из {result.total} правильно — {pct}%
            </div>
            {result.guest && (
              <div style={{ marginTop: 8, fontSize: 13, color: "#888" }}>
                Вы не авторизованы — результат не сохранён в историю.{" "}
                <span style={{ color: "#4f46e5", cursor: "pointer", textDecoration: "underline" }}>
                  Войдите
                </span>, чтобы сохранять прогресс.
              </div>
            )}
            <button style={{ ...S.btn, ...S.btnGray, marginTop: 14 }} onClick={() => setActiveTest(null)}>
              ← К списку тестов
            </button>
          </div>
        ) : (
          <button
            style={{ ...S.btn, ...S.btnPrimary, width: "100%", padding: "10px", marginTop: 4 }}
            onClick={submit}
          >
            Отправить ответы
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 0 }}>
        <button style={S.tab(tab === "list")} onClick={() => setTab("list")}>📝 Тесты</button>
        {user && (
          <button style={S.tab(tab === "results")} onClick={() => setTab("results")}>
            📊 Мои результаты
          </button>
        )}
      </div>

      <div style={{ border: "1px solid #e0e0e0", borderRadius: "0 8px 8px 8px", padding: 16 }}>

        {tab === "list" && (
          <>
            <h3 style={{ marginTop: 0 }}>Список тестов</h3>
            {!user && (
              <div style={{
                background: "#f0f9ff", border: "1px solid #bae6fd",
                borderRadius: 8, padding: "8px 14px", marginBottom: 14, fontSize: 13, color: "#0369a1"
              }}>
                💡 Вы не авторизованы — тесты можно проходить, но результаты не сохранятся.
              </div>
            )}
            {tests.length === 0 && <p style={{ color: "#888" }}>Тестов пока нет</p>}
            {tests.map(t => (
              <div key={t.id} style={{ ...S.card, display: "flex", alignItems: "center" }}>
                <span style={{ flex: 1, fontSize: 16 }}>📋 <b>{t.title}</b></span>
                <button style={{ ...S.btn, ...S.btnPrimary }} onClick={() => openTest(t.id)}>
                  Пройти →
                </button>
              </div>
            ))}
          </>
        )}

        {tab === "results" && (
          <>
            <h3 style={{ marginTop: 0 }}>Мои результаты</h3>
            {myResults.length === 0 && <p style={{ color: "#888" }}>Вы ещё не проходили тесты</p>}
            {myResults.map((r, i) => {
              const pct = Math.round(r.score / (r.total ?? 1) * 100)
              const rs = resultStyle(r.score, r.total ?? r.score)  // fallback если total нет
              // Определяем цвет бейджа по score (без total используем просто цвет по числу)
              const badgeBg = r.score === 0 ? "#fee2e2" : "#dbeafe"
              const badgeColor = r.score === 0 ? "#991b1b" : "#1e40af"
              return (
                <div key={i} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ flex: 1 }}>
                    📋 <b>{testTitles[r.test_id] || `Тест #${r.test_id}`}</b>
                  </span>
                  <span style={{
                    padding: "4px 12px", borderRadius: 12, fontWeight: "bold",
                    background: badgeBg, color: badgeColor
                  }}>
                    {r.score} баллов
                  </span>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
