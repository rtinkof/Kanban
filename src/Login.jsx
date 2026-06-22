import { useState } from "react";
import { apiLogin, setToken } from "./api.js";

const wrap = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f3f4f6",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const card = {
  width: "360px",
  background: "white",
  borderRadius: "16px",
  padding: "32px",
  boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
  boxSizing: "border-box",
};

const input = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  marginBottom: "12px",
  borderRadius: "8px",
  border: "1.5px solid #e5e7eb",
  fontSize: "14px",
  background: "#f9fafb",
  color: "#111827",
  outline: "none",
  boxSizing: "border-box",
};

const submitBtn = (disabled) => ({
  width: "100%",
  padding: "11px",
  border: "none",
  borderRadius: "8px",
  background: disabled ? "#e5e7eb" : "#2563eb",
  color: disabled ? "#9ca3af" : "white",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "14px",
  fontWeight: "600",
  marginTop: "4px",
});

// Экран входа. Регистрации здесь нет намеренно — это внутренний инструмент
// компании, новых сотрудников заводит администратор изнутри приложения
// (раздел "Проекты и сотрудники"), а не сам человек через публичную форму.
export default function Login({ onAuthed }) {
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = loginValue.trim() && password;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setError("");
    setLoading(true);
    try {
      const data = await apiLogin({ login: loginValue.trim(), password });
      setToken(data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err.message || "Что-то пошло не так");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={wrap}>
      <form style={card} onSubmit={handleSubmit}>
        <h1 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "700", color: "#111827" }}>
          Вход
        </h1>
        <p style={{ margin: "0 0 22px", fontSize: "13px", color: "#6b7280" }}>
          Канбан-доска · внутренняя система компании
        </p>

        <input
          value={loginValue}
          onChange={(e) => setLoginValue(e.target.value)}
          placeholder="Логин"
          style={input}
          autoComplete="username"
          autoFocus
        />

        <div style={{ position: "relative", marginBottom: "12px" }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            type={showPassword ? "text" : "password"}
            style={{ ...input, marginBottom: 0, paddingRight: "40px" }}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "4px",
              color: "#9ca3af",
              fontSize: "16px",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
            tabIndex={-1}
            title={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
            borderRadius: "8px", padding: "9px 12px", fontSize: "13px", marginBottom: "12px",
          }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={!canSubmit || loading} style={submitBtn(!canSubmit || loading)}>
          {loading ? "Подождите..." : "Войти"}
        </button>

        <p style={{ margin: "16px 0 0", fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
          Нет аккаунта? Обратитесь к администратору — доступ выдаётся внутри системы.
        </p>
      </form>
    </div>
  );
}