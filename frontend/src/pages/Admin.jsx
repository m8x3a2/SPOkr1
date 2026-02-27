import React, { useState, useEffect } from "react"


export default function Admin({ API, token }) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  const [tests, setTests] = useState([])
  const [users, setUsers] = useState([])
  const [results, setResults] = useState([])
  const [newTest, setNewTest] = useState({ title: "", questions: [] })
  const [qForm, setQForm] = useState({ text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct: "a" })

  const load = () => {
    fetch(`${API}/tests`).then(r => r.json()).then(setTests)
    fetch(`${API}/admin/users`, { headers }).then(r => r.json()).then(setUsers)
    fetch(`${API}/admin/results`, { headers }).then(r => r.json()).then(setResults)
  }

  useEffect(load, [])

  const addQuestion = () => {
    setNewTest({ ...newTest, questions: [...newTest.questions, { ...qForm }] })
    setQForm({ text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct: "a" })
  }

  const createTest = async () => {
    await fetch(`${API}/admin/tests`, { method: "POST", headers, body: JSON.stringify(newTest) })
    setNewTest({ title: "", questions: [] })
    load()
  }

  const deleteTest = async (id) => {
    await fetch(`${API}/admin/tests/${id}`, { method: "DELETE", headers })
    load()
  }

  return (
    <div>
      <h2>Панель администратора</h2>

      <h3>Создать тест</h3>
      <input placeholder="Название теста" value={newTest.title}
        onChange={e => setNewTest({ ...newTest, title: e.target.value })} /><br /><br />

      <b>Добавить вопрос:</b><br />
      <input placeholder="Вопрос" value={qForm.text} onChange={e => setQForm({ ...qForm, text: e.target.value })} /><br />
      {["a","b","c","d"].map(o => (
        <input key={o} placeholder={`Вариант ${o.toUpperCase()}`} value={qForm[`option_${o}`]}
          onChange={e => setQForm({ ...qForm, [`option_${o}`]: e.target.value })} />
      ))}<br />
      Правильный: <select value={qForm.correct} onChange={e => setQForm({ ...qForm, correct: e.target.value })}>
        {["a","b","c","d"].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
      </select>
      <button onClick={addQuestion}>+ Добавить вопрос</button>
      <p>Вопросов добавлено: {newTest.questions.length}</p>
      <button onClick={createTest} disabled={!newTest.title || newTest.questions.length === 0}>Создать тест</button>

      <h3>Все тесты</h3>
      {tests.map(t => (
        <div key={t.id} style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <span>{t.title}</span>
          <button onClick={() => deleteTest(t.id)}>Удалить</button>
        </div>
      ))}

      <h3>Пользователи ({users.length})</h3>
      {users.map(u => <div key={u.id}>{u.username} — {u.role}</div>)}

      <h3>Результаты</h3>
      {results.map((r, i) => <div key={i}>Пользователь {r.user_id}, тест {r.test_id}: {r.score} баллов</div>)}
    </div>
  )
}
