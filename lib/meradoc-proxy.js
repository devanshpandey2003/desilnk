export const PHARMACY_BASE =
  "https://apidev.meradoc.com/pharmacy/api/v1/diagnostic/tenant";

const STATIC = {
  "x-api-id": "PVMD-01",
  "x-api-token": "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu",
  originToken: "ea905fcbecccb788fdde2651cf4ff7d1",
  "Content-Type": "application/json",
  Accept: "application/json",
};

// Fetch a fresh tenant JWT server-side (no user token needed — static creds only)
export async function getServerToken() {
  const res = await fetch("https://apidev.meradoc.com/user/api/v1/sso/tenant", {
    method: "POST",
    headers: STATIC,
    body: JSON.stringify({}),
    cache: "no-store",
  });
  const data = await res.json();
  return data?.data?.token || "";
}

export function meradocHeaders(request) {
  return {
    ...STATIC,
    Authorization: request.headers.get("Authorization") || "",
  };
}

// Always uses a server-generated token — use this for booking/cancel/reschedule
export async function meradocHeadersWithToken() {
  const token = await getServerToken();
  return { ...STATIC, Authorization: token ? `Bearer ${token}` : "" };
}
