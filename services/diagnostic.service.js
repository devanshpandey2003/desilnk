function authHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || "Request failed");
    err.response = { data, status: res.status };
    throw err;
  }
  return data;
}

export const DiagnosticService = {
  // Step 1 — check if pincode/location is serviceable
  checkServiceability: ({ zipcode, lat, long: lng }) =>
    req(`/api/diagnostic/serviceability?zipcode=${encodeURIComponent(zipcode)}&lat=${lat}&long=${lng}`),

  // Step 2 — search test packages by keyword
  searchTests: ({ q, zipcode, page = 1, limit = 10 }) =>
    req(`/api/diagnostic/search?q=${encodeURIComponent(q)}&zipcode=${encodeURIComponent(zipcode)}&page=${page}&limit=${limit}`),

  // Step 3 — get available phlebotomist slots for a date + test list
  getPhleboSlots: (body) =>
    req("/api/diagnostic/slots", { method: "POST", body: JSON.stringify(body) }),

  // Step 4 — book the lab test
  bookLabTest: (body) =>
    req("/api/diagnostic/book", { method: "POST", body: JSON.stringify(body) }),

  // Post-booking — get order details
  getOrder: (orderId) =>
    req(`/api/diagnostic/order/${encodeURIComponent(orderId)}`),

  // Post-booking — cancel order
  cancelOrder: (body) =>
    req("/api/diagnostic/cancel", { method: "POST", body: JSON.stringify(body) }),

  // Post-booking — reschedule order
  rescheduleOrder: (body) =>
    req("/api/diagnostic/reschedule", { method: "POST", body: JSON.stringify(body) }),
};
