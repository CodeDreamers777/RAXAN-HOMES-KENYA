const API_BASE_URL = "https://yakubu.pythonanywhere.com";

export const fetchCSRFToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/get-csrf-token/`, {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    return null;
  }
};

export const fetchProfileData = async (accessToken) => {
  try {
    const token = await fetchCSRFToken();

    const response = await fetch(`${API_BASE_URL}/api/v1/profile/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Referer: API_BASE_URL,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch profile");
    }

    const profileData = await response.json();
    return profileData;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};

export const TOKEN_EXPIRATION_DAYS = 7;

export { API_BASE_URL };
