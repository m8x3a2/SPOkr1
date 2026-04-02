import React, { useState, useEffect } from "react"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Tests from "./pages/Tests"
import Admin from "./pages/Admin"

const API = "http://localhost:8000"

// Простой хэш-роутер без react-router-dom
// URL: /#/tests, /#/login, /#/register, /#/admin
const PAGES = ["home", "tests", "login", "register", "admin"]

function getHashPage() {
  const hash = window.location.hash.replace("#/", "").split("?")[0]
  return PAGES.includes(hash) ? hash : "home"
}

function setHashPage(page) {
  window.location.hash = page === "home" ? "" : `/${page}`
}

// Хлебные крошки для каждой страницы
const BREADCRUMBS = {
  home:     [],
  tests:    [{ label: "Тесты" }],
  login:    [{ label: "Вход" }],
  register: [{ label: "Регистрация" }],
  admin:    [{ label: "Панель администратора" }],
}

export default function App() {
  const [page, setPage] = useState(getHashPage())
  const [token, setToken] = useState(localStorage.getItem("token") || "")
  const [user, setUser] = useState(null)

  // Синхронизация URL -> state при навигации кнопкой «Назад»
  useEffect(() => {
    const onHash = () => setPage(getHashPage())
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  useEffect(() => {
    if (token) {
      fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(u => { if (u) setUser(u); else logout() })
    }
  }, [token])

  const navigate = (p) => {
    setPage(p)
    setHashPage(p)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(""); setUser(null)
    navigate("home")
  }

  const onLogin = (tok) => {
    localStorage.setItem("token", tok)
    setToken(tok)
    navigate("tests")
  }

  const navBtn = (label, target) => (
    <button onClick={() => navigate(target)} style={{
      background: page === target ? "#4f46e5" : "transparent",
      color: page === target ? "#fff" : "#4f46e5",
      border: `1px solid ${page === target ? "#4f46e5" : "#c7d2fe"}`,
      borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 14
    }}>{label}</button>
  )

  const crumbs = BREADCRUMBS[page] || []

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 860, margin: "0 auto", padding: "0 20px 40px" }}>
      {/* Навбар */}
      <nav style={{ display: "flex", gap: 8, alignItems: "center", padding: "14px 0", borderBottom: "2px solid #e0e7ff", marginBottom: 8 }}>
        <span onClick={() => navigate("home")} style={{ fontWeight: "bold", fontSize: 20, color: "#4f46e5", marginRight: 8, cursor: "pointer" }}>📝 TestApp</span>
        <span style={{ flex: 1 }} />
        {navBtn("Тесты", "tests")}
        {!user && navBtn("Войти", "login")}
        {!user && navBtn("Регистрация", "register")}
        {user?.role === "admin" && navBtn("⚙️ Админ", "admin")}
        {user && (
          <span style={{ padding: "5px 12px", background: "#f3f4f6", borderRadius: 6, fontSize: 14, color: "#333" }}>
            👤 {user.username} ({user.role})
          </span>
        )}
        {user && (
          <button onClick={logout} style={{ background: "transparent", color: "#ef4444", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 14px", cursor: "pointer", fontSize: 14 }}>
            Выйти
          </button>
        )}
      </nav>

      {/* Хлебные крошки */}
      {crumbs.length > 0 && (
        <nav style={{ fontSize: 13, color: "#888", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
          <span onClick={() => navigate("home")} style={{ color: "#4f46e5", cursor: "pointer" }}>Главная</span>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              <span style={{ color: "#ccc" }}>›</span>
              <span style={{ color: i === crumbs.length - 1 ? "#333" : "#4f46e5", cursor: i === crumbs.length - 1 ? "default" : "pointer" }}>
                {c.label}
              </span>
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Контент */}
      {page === "home" && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 60 }}>📝</div>
          <h1 style={{ color: "#4f46e5" }}>Добро пожаловать в TestApp!</h1>
          <p style={{ color: "#555", maxWidth: 480, margin: "0 auto 24px" }}>
            Платформа онлайн-тестирования. Просматривайте тесты без регистрации или войдите, чтобы сохранять результаты.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => navigate("tests")} style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 16 }}>
              Смотреть тесты
            </button>
            {!user && (
              <button onClick={() => navigate("register")} style={{ background: "#fff", color: "#4f46e5", border: "2px solid #4f46e5", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 16 }}>
                Зарегистрироваться
              </button>
            )}
          </div>
        </div>
      )}
      {page === "login"    && <Login    API={API} onLogin={onLogin} />}
      {page === "register" && <Register API={API} onDone={() => navigate("login")} />}
      {page === "tests"    && <Tests    API={API} token={token} user={user} />}
      {page === "admin"    && user?.role === "admin" && <Admin API={API} token={token} />}
    </div>
  )
}
