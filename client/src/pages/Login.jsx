import { useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Login() {

  const navigate = useNavigate();
  const location = useLocation();
  const noticeMessage = location.state?.message;

  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    password: "",
  });

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        formData
      );

      localStorage.setItem(
        "userInfo",
        JSON.stringify(res.data)
      );

      navigate("/chat");

    } catch (error) {

      console.log(error);

      alert("Login Failed");
    }
  };

  return (
    <div className="auth-page auth-page-login">
      <div className="auth-card-shell">
        <section className="auth-info-panel auth-info-panel-login">
          <div className="brand-pill">Chat App</div>
          <h1>Welcome back</h1>
          <p>
            Sign in to jump into private conversations, see who is online, and continue where you left off.
          </p>
          <div className="feature-list">
            <div>Instant chat delivery</div>
            <div>Live presence and notifications</div>
            <div>Protected message history</div>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-eyebrow">Returning user</div>
          <h2>Login</h2>
          <p className="auth-subcopy">Use the email and password from your account.</p>
          {noticeMessage && <div className="auth-notice">{noticeMessage}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                name="email"
                placeholder="Enter Email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                placeholder="Enter Password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="auth-button">Login</button>
          </form>

          <p className="auth-footnote">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Login;