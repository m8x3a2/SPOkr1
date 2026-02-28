import React, { useState } from "react"

export default function Register({ API, onDone }) {
  const [form, setForm] = useState({ username: "", password: "" })
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!form.username || !form.password) { setMsg("Заполните все поля"); return }
    setLoading(true)
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    setLoading(false)
    if (res.ok) {
      setMsg("✅ Зарегистрирован! Перенаправляем...")
      setTimeout(onDone, 1500)
    } else {
      const d = await res.json()
      setMsg(d.detail || "Ошибка")
    }
  }

  const S = {
    wrap: { maxWidth: 380, margin: "40px auto", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, padding: 32 },
    input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ccc", fontSize: 15, marginBottom: 14, boxSizing: "border-box" },
    btn: { width: "100%", padding: "10px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" }
  }

  return (
    <div style={S.wrap}>
      <h2 style={{ textAlign: "center", marginTop: 0, color: "#4f46e5" }}>📋 Регистрация</h2>
      <input style={S.input} placeholder="Логин" value={form.username}
        onChange={e => setForm({ ...form, username: e.target.value })} />
      <input type="password" style={S.input} placeholder="Пароль" value={form.password}
        onChange={e => setForm({ ...form, password: e.target.value })}
        onKeyDown={e => e.key === "Enter" && submit()} />
      <button style={S.btn} onClick={submit} disabled={loading}>
        {loading ? "..." : "Зарегистрироваться"}
      </button>
      {msg && <p style={{ textAlign: "center", marginTop: 12, color: msg.startsWith("✅") ? "#16a34a" : "#ef4444" }}>{msg}</p>}
    </div>
  )
}
