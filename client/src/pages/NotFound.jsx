import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>404 — Not Found</h1>
      <p>The page you requested does not exist.</p>
      <p>
        <Link to="/">Go to Login</Link>
      </p>
    </div>
  );
}
