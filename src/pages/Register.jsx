import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const [role, setRole] = useState("tourist");
  const navigate = useNavigate();

  const handleRegister = (event) => {
    event.preventDefault();

    if (role === "tourist") {
      navigate("/tourist-dashboard");
    } else {
      navigate("/authority-dashboard");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          🛡️ YatraSafe
        </div>

        <h1>Create your account</h1>

        <p className="auth-subtitle">
          Join YatraSafe and travel with confidence.
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

        <form onSubmit={handleRegister}>

          <label htmlFor="name">
            Full Name
          </label>

          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
            required
          />

          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            required
          />

          <label htmlFor="phone">
            Phone Number
          </label>

          <input
            id="phone"
            type="tel"
            placeholder="Enter your phone number"
            required
          />

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            placeholder="Create a password"
            required
          />

          <label htmlFor="confirmPassword">
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            required
          />

          <button
            type="submit"
            className="auth-submit"
          >
            Create Account →
          </button>

        </form>

        <p className="switch-auth">
          Already have an account?{" "}
          <Link to="/login">
            Sign in
          </Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to YatraSafe
        </Link>

      </div>
    </div>
  );
}

export default Register;