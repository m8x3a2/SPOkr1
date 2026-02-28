import React, { useState, useEffect } from "react"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Tests from "./pages/Tests"
import Admin from "./pages/Admin"

const API = "http://localhost:8000"

export default function App() {
  const [page, setPage] = useState("home")
  const [token, setToken] = useState(localStorage.getItem("token") || "")
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (token) {
      fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(u => { if (u) setUser(u); else logout() })
    }
  }, [token])

  const logout = () => {
    localStorage.removeItem("token")
    setToken("")
    setUser(null)
    setPage("home")
  }

  const onLogin = (tok) => {
    localStorage.setItem("token", tok)
    setToken(tok)
    setPage("tests")
  }

  const navBtn = (label, target) => (
    <button onClick={() => setPage(target)} style={{
      background: page === target ? "#4f46e5" : "transparent",
      color: page === target ? "#fff" : "#4f46e5",
      border: `1px solid ${page === target ? "#4f46e5" : "#c7d2fe"}`,
      borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 14
    }}>{label}</button>
  )

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 860, margin: "0 auto", padding: "0 20px 40px" }}>
      <nav style={{
        display: "flex", gap: 8, alignItems: "center",
        padding: "14px 0", marginBottom: 24,
        borderBottom: "2px solid #e0e7ff"
      }}>
        <span style={{ fontWeight: "bold", fontSize: 20, color: "#4f46e5", marginRight: 8 }}>📝 TestApp</span>
        <span style={{ flex: 1 }} />
        {navBtn("Тесты", "tests")}
        {!user && navBtn("Войти", "login")}
        {!user && navBtn("Регистрация", "register")}
        {user?.role === "admin" && navBtn("⚙️ Админ", "admin")}
        {user && (
          <span style={{
            padding: "5px 12px", background: "#f3f4f6", borderRadius: 6,
            fontSize: 14, color: "#333"
          }}>👤 {user.username} ({user.role})</span>
        )}
        {user && (
          <button onClick={logout} style={{
            background: "transparent", color: "#ef4444",
            border: "1px solid #fca5a5", borderRadius: 6,
            padding: "5px 14px", cursor: "pointer", fontSize: 14
          }}>Выйти</button>
        )}
      </nav>

      {page === "home" && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 60 }}>📝</div>
          <h1 style={{ color: "#4f46e5" }}>Добро пожаловать в TestApp!</h1>
          <p style={{ color: "#555", maxWidth: 480, margin: "0 auto 24px" }}>
            Платформа онлайн-тестирования. Просматривайте тесты без регистрации
            или войдите, чтобы сохранять результаты.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => setPage("tests")} style={{
              background: "#4f46e5", color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 16
            }}>Смотреть тесты</button>
            {!user && <button onClick={() => setPage("register")} style={{
              background: "#fff", color: "#4f46e5", border: "2px solid #4f46e5",
              borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 16
            }}>Зарегистрироваться</button>}
          </div>
        </div>
      )}
      {page === "login" && <Login API={API} onLogin={onLogin} />}
      {page === "register" && <Register API={API} onDone={() => setPage("login")} />}
      {page === "tests" && <Tests API={API} token={token} user={user} />}
      {page === "admin" && user?.role === "admin" && <Admin API={API} token={token} />}
    </div>
  )
}
