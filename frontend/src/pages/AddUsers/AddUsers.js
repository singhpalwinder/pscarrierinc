import React, { useContext, useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/apiClient";
import "./AddUsers.css"

const AddUser = () => {
    const { isAuthenticated, isStaff } = useContext(AuthContext);
    const navigate = useNavigate();
    
    useEffect(() => {
        document.title = "Add Users";
    }, []);

      useEffect(() => {
        if (!isAuthenticated || !isStaff) {
          navigate("/");
        }
      }, [isAuthenticated, isStaff, navigate])

    const [userInfo, setUserInfoData] = useState(() => {
        const saved = sessionStorage.getItem("addUser")
        return saved ? JSON.parse(saved) : {};
    })
 
    useEffect(() => {
        sessionStorage.setItem("addUser", JSON.stringify(userInfo))
    }, [userInfo])
    const handleChange = (e) => {
        const { id, name, value } = e.target;
        
        let newValue = value

       if (id === "is-admin-yes" || id === "is-admin-no" || id === "is-staff-yes" || id === "is-staff-no" || id === "genAPIKey-yes" || id === "genAPIKey-no" || id === "is-driver-yes" || id === "is-driver-no") {
        newValue = value === "true";
       }
        
        const key = name || id;

        const updated = { ...userInfo, [key]: newValue };
        setUserInfoData(updated);
    }
    const submitUserInfo = async (e) => {
        e.preventDefault();

    try {
      const response = await apiFetch("/addUser", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            first_name: userInfo["fname"],
            last_name: userInfo["lname"],
            primary_phone_number: userInfo["primary-phone-number"],
            primary_email: userInfo["primary-email"],
            username: userInfo["username"],
            password: userInfo["password"],
            is_admin: userInfo["is-admin"] || false,
            is_staff: userInfo["is-staff"] || false,
            is_driver: userInfo["is-driver"] || false,
            genAPIKey: userInfo["genAPIKey"] || false,
        })
      });

      if (!response.ok) throw new Error("Server error");

    // sessionStorage.removeItem("jobApplicationData");
        toast.success("Application submitted! 📨");
        sessionStorage.removeItem("addUser");
    } catch (err) {
      toast.error("Error submitting Application")
      console.error(err);
    }
  };
    return (
        <>
               <form onSubmit={submitUserInfo}>
            <table className="">
                <thead>
                    <tr><th colSpan="2"><h2>Add User</h2></th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <label htmlFor="fname">First Name</label>
                            <input type="text" id="fname" placeholder="John" value={userInfo["fname"] || ""} onChange={handleChange} required/>
                        </td>
                        <td>
                            <label htmlFor="lname">Last Name</label>
                            <input type="text" id="lname" placeholder="Doe" value={userInfo["lname"] || ""} onChange={handleChange} required/>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="primary-phone-number">Primary Phone Number</label>
                            <input type="text" id="primary-phone-number" placeholder="0123456789" value={userInfo["primary-phone-number"] || ""} onChange={handleChange} required/>
                        </td>
                        <td>
                            <label htmlFor="primary-email">Email Address</label>
                            <input type="email" id="primary-email" placeholder="johndoe@gmail.com" value={userInfo["primary-email"] || ""} onChange={handleChange} required/>
                        </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="is-admin">is Admin</label>
                                <div className="user-options">
                                    <label>
                                        <input name="is-admin" type="radio" id="is-admin-yes" value="true" checked={userInfo["is-admin"] === true} onChange={handleChange}></input>
                                        yes
                                    </label>
                                    
                                    <label>
                                        <input name="is-admin" type="radio" id="is-admin-no" value="false" checked={userInfo["is-admin"]=== false} onChange={handleChange}></input>
                                        no
                                    </label>
                                </div>
                            </td>
                            <td>
                                <label htmlFor="is-staff">is Staff</label>
                                <div className="user-options">
                                    <label>
                                        <input name="is-staff" type="radio" id="is-staff-yes" value="true" checked={userInfo["is-staff"] === true} onChange={handleChange}></input>
                                        yes
                                    </label>
                                    
                                    <label>
                                        <input name="is-staff" type="radio" id="is-staff-no" value="false" checked={userInfo["is-staff"]=== false} onChange={handleChange}></input>
                                        no
                                    </label>
                                    
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="is-driver">is Driver</label>
                                <div className="user-options">
                                    <label>
                                        <input name="is-driver" type="radio" id="is-driver-yes" value="true" checked={userInfo["is-driver"] === true} onChange={handleChange}></input>
                                        yes
                                    </label>
                                    
                                    <label>
                                        <input name="is-driver" type="radio" id="is-driver-no" value="false" checked={userInfo["is-driver"]=== false} onChange={handleChange}></input>
                                        no
                                    </label>
                                    
                                </div>
                            </td>
                            <td>
                                <label htmlFor="gen-api-key">Gen API Key</label>
                                <div className="user-options">
                                    <label>
                                        <input name="genAPIKey" type="radio" id="genAPIKey-yes" value="true" checked={userInfo["genAPIKey"] === true} onChange={handleChange}></input>
                                        yes
                                    </label>
                                    
                                    <label>
                                        <input name="genAPIKey" type="radio" id="genAPIKey-no" value="false" checked={userInfo["genAPIKey"]=== false} onChange={handleChange}></input>
                                        no
                                    </label>
                                    
                                </div>
                            </td>
                        </tr>
                    <tr>
                        <td>
                            <label htmlFor="username">Preferred username</label>
                            <input autofill="off" type="text" id="username" placeholder="jdoe" autoComplete="off" autoCapitalize="off" value={userInfo["username"] || ""} onChange={handleChange} required/>
                            </td>
                        <td>
                            <label htmlFor="password">password</label>
                            <input autofill="off" type="password" id="password" autoComplete="off" autoCapitalize="off" value={userInfo["password"] || ""} onChange={handleChange} required/>
                        </td>
                    </tr>
                </tbody>
                </table>
                <button type="submit">Submit</button>
        </form>
        <ToastContainer position="top-right" autoClose={3000} />
        </>
    );
};

export default AddUser;