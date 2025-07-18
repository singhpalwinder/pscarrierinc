import { toast } from "react-toastify";

const API_BASE_URL = process.env.REACT_APP_API_LOGIN_URL;

export async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",
      credentials: "include", // send cookies
    });

    if (response.ok) {
      return true;
    } else {
      console.warn("Session expired, no refresh available.");
      return false; // ✅ don’t call logout() here
    }
  } catch (err) {
    console.error("Refresh token error:", err);
    return false;
  }
}

export async function logout() {
  try {
    await fetch(`${API_BASE_URL}/logout/`, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.warn("Error during logout:", err);
  }

  localStorage.removeItem("username");
  window.location.href = "/";
}

export async function apiFetch(url, options = {}, retry = true) {
  let headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
  };

  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: "include", // essential for cookies
  });

  console.log(`Initial request to ${url} returned status:`, response.status);

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(url, options, false); // retry once
    } else {
      throw new Error("Session expired. Please log in again.");
    }
  }

  return response;
}