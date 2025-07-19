import { Routes, Route} from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import TripSheet from "./pages/TripSheets/TripSheet";
import JobApplication from "./pages/Careers/JobApplication";
import Login from "./pages/Login/Login";
import AddUser from "./pages/AddUsers/AddUsers";
import ShowUsers from "./pages/showUsers/ShowUsers";
import MergePDF from "./pages/MergePDF/MergePDF";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Home from "./pages/Home/Home";

import "./App.css";

function App() {

  return (
    <AuthProvider>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/JobApplication" element={<JobApplication />} />
          <Route path="/Login" element={<Login />} />
          <Route
            path="/AddUser"
            element={<ProtectedRoute><AddUser /></ProtectedRoute>
            }/>
          <Route
            path="/TripSheets"
            element={
            <ProtectedRoute><TripSheet /></ProtectedRoute>
            } />
          <Route
            path="/MergePDF"
            element={
            <ProtectedRoute><MergePDF /></ProtectedRoute>
          } />
          <Route
            path="/Users"
            element={
            <ProtectedRoute><ShowUsers /></ProtectedRoute>
            } />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
