import React, { useState } from "react"

export default function Register({ API, onDone }) {
  const [form, setForm] = useState({ username: "", password: "" })
  const [msg, setMsg] = useState("")
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    const u = form.username.trim()
    const p = form.password
    if (!u) e.username = "Введите имя пользователя"
    else if (u.length < 3) e.username = "Минимум 3 символа"
    else if (u.length > 40) e.username = "Максимум 40 символов"
    if (!p) e.password = "Введите пароль"
    else if (p.length < 6) e.password = "Минимум 6 символов"
    else if (p.length > 40) e.password = "Максимум 40 символов"
    return e
  }

  const submit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setLoading(true)
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.username.trim(), password: form.password })
    })
    setLoading(false)
    if (res.ok) {
      setMsg("✅ Зарегистрирован! Перенаправляем...")
      setTimeout(onDone, 1500)
    } else {
      const d = await res.json()
      // Обработка 422 от Pydantic
      if (d.detail && Array.isArray(d.detail)) {
        const e2 = {}
        d.detail.forEach(err => {
          const field = err.loc?.[1]
          if (field) e2[field] = err.msg.replace("Value error, ", "")
        })
        setErrors(e2)
      } else {
        setMsg(typeof d.detail === "string" ? d.detail : "Ошибка регистрации")
      }
    }
  }

  const S = {
    wrap: { maxWidth: 380, margin: "40px auto", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, padding: 32 },
    input: (err) => ({ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${err ? "#ef4444" : "#ccc"}`, fontSize: 15, marginBottom: 4, boxSizing: "border-box" }),
    err: { color: "#ef4444", fontSize: 12, marginBottom: 10, display: "block" },
    hint: { color: "#888", fontSize: 12, marginBottom: 10, display: "block" },
    btn: { width: "100%", padding: "10px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" }
  }

  return (
    <div style={S.wrap}>
      <h2 style={{ textAlign: "center", marginTop: 0, color: "#4f46e5" }}>📋 Регистрация</h2>
      <input style={S.input(errors.username)} placeholder="Логин" value={form.username}
        onChange={e => { setForm({ ...form, username: e.target.value }); setErrors(p => ({ ...p, username: "" })) }} />
      {errors.username
        ? <span style={S.err}>{errors.username}</span>
        : <span style={S.hint}>3–40 символов</span>
      }
      <input type="password" style={S.input(errors.password)} placeholder="Пароль" value={form.password}
        onChange={e => { setForm({ ...form, password: e.target.value }); setErrors(p => ({ ...p, password: "" })) }}
        onKeyDown={e => e.key === "Enter" && submit()} />
      {errors.password
        ? <span style={S.err}>{errors.password}</span>
        : <span style={S.hint}>6–40 символов</span>
      }
      <button style={S.btn} onClick={submit} disabled={loading}>
        {loading ? "..." : "Зарегистрироваться"}
      </button>
      {msg && <p style={{ textAlign: "center", marginTop: 12, color: msg.startsWith("✅") ? "#16a34a" : "#ef4444" }}>{msg}</p>}
    </div>
  )
}
