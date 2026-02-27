import React, { useState, useEffect } from "react"


export default function Tests({ API, token, user }) {
  const [tests, setTests] = useState([])
  const [activeTest, setActiveTest] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetch(`${API}/tests`).then(r => r.json()).then(setTests)
  }, [])

  const openTest = async (id) => {
    const res = await fetch(`${API}/tests/${id}`)
    const data = await res.json()
    setActiveTest(data)
    setAnswers({})
    setResult(null)
  }

  const submit = async () => {
    const res = await fetch(`${API}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ test_id: activeTest.id, answers })
    })
    const data = await res.json()
    setResult(`Результат: ${data.score} из ${activeTest.questions.length}`)
  }

  if (activeTest) return (
    <div>
      <button onClick={() => setActiveTest(null)}>← Назад</button>
      <h2>{activeTest.title}</h2>
      {activeTest.questions.map(q => (
        <div key={q.id} style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <b>{q.text}</b>
          {["a","b","c","d"].map(opt => (
            <div key={opt}>
              <label>
                <input type="radio" name={`q${q.id}`} value={opt}
                  onChange={() => setAnswers({ ...answers, [q.id]: opt })} />
                {" "}{q[`option_${opt}`]}
              </label>
            </div>
          ))}
        </div>
      ))}
      {user
        ? <button onClick={submit}>Отправить</button>
        : <p>Войдите, чтобы сдать тест</p>}
      {result && <p style={{ color: "green", fontWeight: "bold" }}>{result}</p>}
    </div>
  )

  return (
    <div>
      <h2>Список тестов</h2>
      {tests.length === 0 && <p>Тестов пока нет</p>}
      {tests.map(t => (
        <div key={t.id} style={{ marginBottom: 8, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <b>{t.title}</b>
          <button style={{ marginLeft: 12 }} onClick={() => openTest(t.id)}>Пройти</button>
        </div>
      ))}
    </div>
  )
}
