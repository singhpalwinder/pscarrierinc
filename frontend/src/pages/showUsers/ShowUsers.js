import { useEffect, useState, useContext } from "react";
import { apiFetch } from "../../api/apiClient";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ShowUsers = () => {
  const [users, setUsers] = useState([]);
  const { isAuthenticated, isStaff } = useContext(AuthContext);
  const navigate = useNavigate();

      useEffect(() => {
          document.title = "Users";
      }, []);
  
  useEffect(() => {
          if (!isAuthenticated || !isStaff) {
            navigate("/");
          }
  }, [isAuthenticated, isStaff, navigate])
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await apiFetch("/users", {}, true);
        if (!res.ok) {
          throw new Error(`Error fetching users: ${res.status}`);
        }
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
  }, []); // ✅ run once on mount

  return (
    <>
      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table>
        <thead>
            <tr>
                <th colSpan={9}>Users</th>
            </tr>                  
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Admin</th>
              <th>Staff</th>
              <th>Driver</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.first_name}</td>
                <td>{u.last_name}</td>
                <td>{u.primary_phone_number}</td>
                <td>{u.primary_email}</td>
                <td>{u.is_admin ? "✅" : "❌"}</td>
                <td>{u.is_staff ? "✅" : "❌"}</td>
                <td>{u.is_driver ? "✅" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

export default ShowUsers;