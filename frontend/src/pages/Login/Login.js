import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import './Login.css';
import { apiFetch } from "../../api/apiClient";
import { AuthContext } from "../../context/AuthContext";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { setIsAuthenticated, setIsStaff, setIsAdmin, setUserName } = useContext(AuthContext);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  

const handleLogin = async (e) => {
  e.preventDefault();
  setError("");

  try {
    const response = await apiFetch("/token", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("JSON parse failed:", err);
      toast.error("Unexpected server response");
      return;
    }

    if (response.ok) {
      // Use trusted values from server
      setIsAuthenticated(true);
      setIsStaff(data.is_staff);
      setIsAdmin(data.is_admin);
      setUserName(data.username || username);

      navigate("/TripSheets");
    } else {
      setError(data.detail || "Invalid credentials");
    }
  } catch (error) {
    toast.error("Error during login");
    console.error(error);
  }
};

    return (
        <>
    <form onSubmit={handleLogin}>
    <div className="login-form">
      <h3>Login</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      
        <input
          type="text"
          autoCapitalize="off"
          spellCheck="false"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      
            </div>
            </form>
            <ToastContainer position="top-right" autoClose={3000} />
        </>
  );
}

export default Login;