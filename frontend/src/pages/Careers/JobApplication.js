import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { apiFetch } from "../../api/apiClient";
import "./JobApplication.css"

const JobApplication = () => {
    useEffect(() => {
        document.title = "Job Application";
    }, []);

    const [jobAppData, setJobAppData] = useState(() => {
        const saved = sessionStorage.getItem("jobApplicationData")
        return saved ? JSON.parse(saved) : {};
    })

    useEffect(() => {
        sessionStorage.setItem("jobApplicationData", JSON.stringify(jobAppData))
    }, [jobAppData])
    const handleChange = (e) => {
        const id = e.target.id;
        let value = e.target.value;

        const updated = { ...jobAppData, [id]: value };
        setJobAppData(updated);
    }
    const submitApplication = async (e) => {
        e.preventDefault();

    try {
      const response = await apiFetch("/jobApplication", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            first_name: jobAppData["fname"],
            last_name: jobAppData["lname"],
            primary_phone_number: jobAppData["primary-phone-number"],
            primary_email: jobAppData["primary-email"],
            drivers_license_number: jobAppData["drivers-license-number"],
            drivers_license_state: jobAppData["drivers-license-state"],
            years_of_experience: jobAppData["years-of-experience"],
        })
      });

      if (!response.ok) throw new Error("Server error");

    // sessionStorage.removeItem("jobApplicationData");
    toast.success("Application submitted! 📨");
    } catch (err) {
      toast.error("Error submitting Application")
      console.error(err);
    }
  };
    return (
        <>
               <form onSubmit={submitApplication}>
            <table className="job-application">
                <thead>
                    <tr><th colSpan="2"><h2>Job Application</h2></th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <label htmlFor="fname">First Name</label>
                            <input type="text" id="fname" placeholder="John" value={jobAppData["fname"] || ""} onChange={handleChange} required/>
                        </td>
                        <td>
                            <label htmlFor="lname">Last Name</label>
                            <input type="text" id="lname" placeholder="Doe" value={jobAppData["lname"] || ""} onChange={handleChange} />
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="primary-phone-number">Primary Phone Number</label>
                            <input type="text" id="primary-phone-number" placeholder="0123456789" value={jobAppData["primary-phone-number"] || ""} onChange={handleChange} required/>
                        </td>
                        <td>
                            <label htmlFor="primary-email">Email Address</label>
                            <input type="email" id="primary-email" placeholder="johndoe@gmail.com" value={jobAppData["primary-email"] || ""} onChange={handleChange} required/>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label htmlFor="drivers-license-number">DL #</label>
                            <input type="text" id="drivers-license-number" placeholder="12345678" value={jobAppData["drivers-license-number"] || ""} onChange={handleChange} required/>
                        </td>
                        <td>
                            <label htmlFor="drivers-license-state">DL State</label>
                            <input type="text" id="drivers-license-state" placeholder="TX" value={jobAppData["drivers-license-state"] || ""} onChange={handleChange} required/>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan="2">
                            <label htmlFor="years-of-experience">Years of Experience</label>
                            <input type="number" id="years-of-experience" placeholder="5" min="1" max="100" value={jobAppData["years-of-experience"] || ""} onChange={handleChange} required/>
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

export default JobApplication;