import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    phone: "",
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

      await axios.post(
        "http://localhost:5000/api/auth/register",
        formData
      );

      navigate("/login", {
        state: {
          email: formData.email,
          message: "Account created. Please log in to continue.",
        },
      });

    } catch (error) {

      console.log(error);

      alert("Registration Failed");
    }
  };

  return (
    <div className="auth-page auth-page-register">
      <div className="auth-card-shell">
        <section className="auth-form-panel">
          <div className="auth-brand">Chat App</div>
          <div className="auth-eyebrow">New account</div>
          <h1>Create your account</h1>
          <p className="auth-subcopy">Tell us a bit about yourself to get started.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-grid two-up">
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  placeholder="Enter Name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </label>

              <label>
                Age
                <input
                  type="number"
                  name="age"
                  placeholder="Enter Age"
                  value={formData.age}
                  onChange={handleChange}
                  min="1"
                  autoComplete="off"
                />
              </label>
            </div>

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
              Phone Number
              <input
                type="tel"
                name="phone"
                placeholder="Enter Phone Number"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
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
                autoComplete="new-password"
              />
            </label>

            <button type="submit" className="auth-button">Register</button>
          </form>

          <p className="auth-footnote">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Register;
