import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://apidev.meradoc.com";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "x-api-id": "PEMD-01",
    "x-api-token": "YETBSJ2634899SCB3NK02345BADJB2",
    "Content-Type": "application/json",
  },
});

// Track if a token refresh is already in progress to avoid multiple simultaneous refreshes
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

async function refreshAccessToken() {
  const response = await api.post("/user/api/v1/sso/tenant");
  const token = response.data?.data?.token;
  if (token && typeof window !== "undefined") {
    localStorage.setItem("accessToken", token);
    console.log("Access token auto-refreshed after 401.");
  }
  return token;
}

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("accessToken");
      const originToken = localStorage.getItem("originToken");

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      if (originToken) {
        config.headers.originToken = originToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry once on server errors (5xx)
    if (!originalRequest._retry && error.response && error.response.status >= 500) {
      originalRequest._retry = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return api(originalRequest);
    }

    // Auto-refresh token on 401 (session expired)
    if (error.response?.status === 401 && !originalRequest._tokenRetry) {
      // Don't retry the token-generation endpoint itself to avoid infinite loops
      if (originalRequest.url?.includes("/sso/tenant")) {
        return Promise.reject(error);
      }

      originalRequest._tokenRetry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);

          // Retry the original request with the new token
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          refreshSubscribers = [];
          console.error("Token refresh failed. Session may have truly expired.", refreshError);
          return Promise.reject(refreshError);
        }
      } else {
        // Another refresh is in progress — wait for it to complete, then retry
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          });
        });
      }
    }

    if (error.response?.status === 403) {
      console.error("Forbidden. You lack permission to perform this task.");
    }
    return Promise.reject(error);
  }
);

export const UserAPI = {
  getUserProfile: async () => {
    // Dummy fallback bridging the overwritten lib/api.js behavior
    return {
      data: {
        firstName: "Test",
        lastName: "User",
        email: "test@meradoc.com",
        phone: "+91 9999999999",
        dob: "1990-01-01",
        bloodGroup: "O+"
      }
    };
  }
};
