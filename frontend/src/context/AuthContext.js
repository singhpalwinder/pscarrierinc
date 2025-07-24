import React, { createContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const AuthContext = createContext();
const API_BASE_URL = process.env.REACT_APP_API_LOGIN_URL;

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = not checked yet
  const [hasChecked, setHasChecked] = useState(false);
  const location = useLocation();


  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (hasChecked) return;

    const checkSession = async () => {
      try {
        // ✅ 1) Verify the access token
        let verified = await fetch(`${API_BASE_URL}/verify`, {
          method: "POST",
          credentials: "include",
        });

        if (!verified.ok) {
          // Try to refresh
          const refresh = await fetch(`${API_BASE_URL}/refresh`, {
            method: "POST",
            credentials: "include",
          });
          verified = refresh;
        }

        if (verified.ok) {
          // fetch trusted profile info
          const profileResp = await fetch(`${API_BASE_URL}/profile`, {
            method: "GET",
            credentials: "include",
          });

          if (!profileResp.ok) {
            throw new Error("Profile fetch failed");
          }

          const data = await profileResp.json();
          setIsAuthenticated(true);
          setIsStaff(data.is_staff);
          setIsAdmin(data.is_admin);
          setUserName(data.username);
        } else {
          setIsAuthenticated(false);
          setIsStaff(false);
          setIsAdmin(false);
          setUserName("");
        }

        setHasChecked(true);
      } catch (err) {
        console.warn("Session check failed:", err);
        setIsAuthenticated(false);
        setIsStaff(false);
        setIsAdmin(false);
        setUserName("");
        setHasChecked(true);
      }
    };

    checkSession();
  }, [location.pathname, hasChecked]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        isStaff,
        setIsStaff,
        isAdmin,
        setIsAdmin,
        userName,
        setUserName,
        hasChecked,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};