import axios from "axios";

// Route all MeraDoc calls through our server-side proxy to avoid browser CORS.
// MeraDoc does not send Access-Control-Allow-Origin, so direct browser calls
// are blocked. The proxy injects x-api-id / x-api-token / originToken server-side.
const MERADOC_BASE = "/api/meradoc-proxy";

const FIXED_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export const api = axios.create({
  baseURL: MERADOC_BASE,
  headers: FIXED_HEADERS,
});

// Attach per-user auth token from localStorage on every request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Token refresh helpers ────────────────────────────────────────────────────
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

// ─── Response interceptor ─────────────────────────────────────────────────────
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
          if (newToken) originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          isRefreshing = false;
          refreshSubscribers = [];
          console.error("Token refresh failed.", refreshError);
          return Promise.reject(refreshError);
        }
      } else {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            if (newToken) originalRequest.headers.Authorization = `Bearer ${newToken}`;
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
    return {
      data: {
        firstName: "Test",
        lastName: "User",
        email: "test@meradoc.com",
        phone: "+91 9999999999",
        dob: "1990-01-01",
        bloodGroup: "O+",
      },
    };
  },
};
