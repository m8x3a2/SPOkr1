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

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <nav style={{ display: "flex", gap: 12, marginBottom: 24, borderBottom: "1px solid #ccc", paddingBottom: 12 }}>
        <b>📝 TestApp</b>
        <span style={{ flex: 1 }} />
        <button onClick={() => setPage("tests")}>Тесты</button>
        {!user && <button onClick={() => setPage("login")}>Войти</button>}
        {!user && <button onClick={() => setPage("register")}>Регистрация</button>}
        {user && <span>👤 {user.username} ({user.role})</span>}
        {user?.role === "admin" && <button onClick={() => setPage("admin")}>Админ</button>}
        {user && <button onClick={logout}>Выйти</button>}
      </nav>

      {page === "home" && (
        <div>
          <h2>Добро пожаловать!</h2>
          <p>Платформа онлайн-тестирования. <button onClick={() => setPage("tests")}>Смотреть тесты</button></p>
        </div>
      )}
      {page === "login" && <Login API={API} onLogin={onLogin} />}
      {page === "register" && <Register API={API} onDone={() => setPage("login")} />}
      {page === "tests" && <Tests API={API} token={token} user={user} />}
      {page === "admin" && user?.role === "admin" && <Admin API={API} token={token} />}
    </div>
  )
}
