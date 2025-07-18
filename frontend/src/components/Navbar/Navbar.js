import React, { useEffect, useState, useContext } from "react";
import "./Navbar.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { apiFetch } from "../../api/apiClient";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated,hasChecked, setIsAuthenticated, isStaff, setIsStaff, isAdmin,setIsAdmin, userName, setUserName } = useContext(AuthContext);
  const [today, setToday] = useState("");

  

  useEffect(() => {
    const date = new Date().toLocaleDateString();
    setToday(date);
  }, []);

  if (!hasChecked) return null;

const handleLogout = async () => {
  try {
    await apiFetch("/logout", { method: "POST" }, false);
  } catch (err) {
    console.warn("Logout failed or session already expired. Ignoring.");
  }

  //Clear all context state — single source of truth
  setIsAuthenticated(false);
  setIsStaff(false);
  setIsAdmin(false);
  setUserName("");

  navigate("/");
};

    return (
        <nav >
            <div className="nav-info">
                <h6>{userName}</h6>
                <h6>{today}</h6>
            </div>
            <div className="nav-links">
              <ul className="site-routes">
            <li>
              <Link to="/" className={location.pathname === "/" ? "active" : ""}>
                    <h4>Home</h4>
            </Link>
                </li>

        {isAuthenticated  && isStaff && (
          <li className="dropdown">
            <span>Admin ▾</span>
            <ul className="dropdown-content">
              <li>
                <Link to="/AddUser" className={location.pathname === "/AddUsers" ? "active" : ""}>
                  Add User
                </Link>
              </li>
              <li>
                <Link to="/Users" className={location.pathname === "/Users" ? "active" : ""}>
                  Users
                </Link>
              </li>
            </ul>
          </li>
            )}
          {isAuthenticated  && (isAdmin || isStaff) && (
          <li className="dropdown">
            <span>Tools ▾</span>
            <ul className="dropdown-content">
              <li>
                <Link to="/TripSheets" className={location.pathname === "/TripSheets" ? "active" : ""}>
                  TripSheets
                </Link>
                  </li>
                  <li>
                    <Link to="MergePDF" className={location.pathname === "/MergePDF" ? "active" : ""}>
                      MergePDF
                    </Link>
                </li>
            </ul>
          </li>
        )}
            <li>
              <Link to="/JobApplication" className={location.pathname === "/JobApplication" ? "active" : ""}>
                    <h4>Jobs</h4>
                </Link>
                </li>
            </ul>            
                <div className="companyHeading">
                  {isAuthenticated ? (
                    <button
                        onClick={handleLogout}
                        style={{ backgroundColor: "red" }}
                    >
                        Logout
                    </button>
                ) : (
                    <button
                        onClick={() => navigate("/Login")}
                        style={{ backgroundColor: "blue" }}
                    >
                        Login
                    </button>
                )}
                <img src="/companyLogo.png" alt="company_logo" />  
            </div>
            </div>
        </nav>
    );
}

export default Navbar;