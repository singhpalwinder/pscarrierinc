
const API_BASE_URL = process.env.REACT_APP_API_LOGIN_URL;

export async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",
      credentials: "include", // ✅ send cookie
    });

    if (response.ok) {
      return true; // Cookie was rotated by backend
    } else {
      return false;
    }
  } catch (e) {
    return false;
  }
}

export async function apiFetch(url, options = {}, retry = true) {
  let headers = options.headers || {};
  
  const isFormData = options.body instanceof FormData;
  
  if (!isFormData) {
    headers = {
    ...(headers || {}),
    "Content-Type": "application/json",
  };
  }
  

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
    credentials: "include", // ✅ include cookie on every request
  });

  console.log(`Request to ${url} returned status:`, response.status);

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