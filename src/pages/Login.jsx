import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const [role, setRole] = useState("tourist");
  const navigate = useNavigate();

  function handleLogin(event) {
    event.preventDefault();

    if (role === "tourist") {
      navigate("/tourist-dashboard");
    } else {
      navigate("/authority-dashboard");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🛡️ YatraSafe</div>

        <h1>Welcome back</h1>

        <p className="auth-subtitle">
          Sign in to continue your safe journey.
        </p>

        <div className="role-selector">
          <button
            type="button"
            className={role === "tourist" ? "role active" : "role"}
            onClick={() => setRole("tourist")}
          >
            🧳 Tourist
          </button>

          <button
            type="button"
            className={role === "authority" ? "role active" : "role"}
            onClick={() => setRole("authority")}
          >
            👮 Authority
          </button>
        </div>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            required
          />

          <button type="submit" className="auth-submit">
            Sign In →
          </button>
        </form>

        <p className="switch-auth">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to YatraSafe
        </Link>
      </div>
    </div>
  );
}

export default Login;