import React, { useState } from "react"


export default function Register({ API, onDone }) {
  const [form, setForm] = useState({ username: "", password: "" })
  const [msg, setMsg] = useState("")

  const submit = async () => {
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setMsg("Зарегистрирован! Теперь войдите.")
      setTimeout(onDone, 1500)
    } else {
      const d = await res.json()
      setMsg(d.detail || "Ошибка")
    }
  }

  return (
    <div>
      <h2>Регистрация</h2>
      <input placeholder="Логин" value={form.username}
        onChange={e => setForm({ ...form, username: e.target.value })} /><br /><br />
      <input type="password" placeholder="Пароль" value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })} /><br /><br />
      <button onClick={submit}>Зарегистрироваться</button>
      {msg && <p>{msg}</p>}
    </div>
  )
}
