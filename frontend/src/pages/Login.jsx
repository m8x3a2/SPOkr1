import React, { useState } from "react"


export default function Login({ API, onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" })
  const [error, setError] = useState("")

  const submit = async () => {
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      const data = await res.json()
      onLogin(data.access_token)
    } else {
      setError("Неверный логин или пароль")
    }
  }

  return (
    <div>
      <h2>Вход</h2>
      <input placeholder="Логин" value={form.username}
        onChange={e => setForm({ ...form, username: e.target.value })} /><br /><br />
      <input type="password" placeholder="Пароль" value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })} /><br /><br />
      <button onClick={submit}>Войти</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  )
}
