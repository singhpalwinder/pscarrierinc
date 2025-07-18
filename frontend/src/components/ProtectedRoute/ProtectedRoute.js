import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, hasChecked } = useContext(AuthContext);

  // Still loading auth state
  if (isAuthenticated === null || !hasChecked) {
    return <div>Loading...</div>; // or show spinner, etc.
  }

  // Not authenticated
  if (isAuthenticated === false) {
    return <Navigate to="/Login" replace />;
  }

  // Authenticated
  return children;
};

export default ProtectedRoute;