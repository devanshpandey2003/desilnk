import { NextResponse } from "next/server";

const MERADOC_BASE = "https://apidev.meradoc.com";
const X_API_ID     = "PVMD-01";
const X_API_TOKEN  = "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu";
const ORIGIN_TOKEN = "ea905fcbecccb788fdde2651cf4ff7d1";

async function getAccessToken() {
  const res = await fetch(`${MERADOC_BASE}/user/api/v1/sso/tenant`, {
    method: "POST",
    headers: {
      "x-api-id":    X_API_ID,
      "x-api-token": X_API_TOKEN,
      "originToken": ORIGIN_TOKEN,
    },
  });
  const json = await res.json();
  return json?.data?.token;
}

// POST /api/medicine/availability
// Body: { pincode: "400001", ucodes: ["059346"] }
// Returns: { availability: { [ucode]: true | false }, raw: {...} }
export async function POST(request) {
  try {
    const { pincode, ucodes } = await request.json();

    if (!pincode || !Array.isArray(ucodes) || ucodes.length === 0) {
      return NextResponse.json({ error: "pincode and ucodes[] required" }, { status: 400 });
    }

    // Availability endpoint requires a Bearer token (401 without it)
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ error: "Failed to get MeraDoc token" }, { status: 500 });
    }

    const res = await fetch(`${MERADOC_BASE}/go/api/v1/drug/drugs/availability`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "x-api-id":      X_API_ID,
        "x-api-token":   X_API_TOKEN,
        "originToken":   ORIGIN_TOKEN,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ pincode, ucodes }),
    });

    const json = await res.json();

    // Real response shape: { data: { items: [{ ucode, availability, name, ... }], errors: [], providers: [] } }
    const availability = {};
    const items = json?.data?.items || json?.data?.list || (Array.isArray(json?.data) ? json.data : []);
    if (Array.isArray(items)) {
      items.forEach(item => {
        const ucode = item.ucode || item.ucodes;
        if (ucode) {
          availability[String(ucode)] = item.availability === true
            || item.isAvailable === true
            || item.status === "AVAILABLE"
            || item.fulfilability === "IN_STOCK";
        }
      });
    }

    if (Object.keys(availability).length === 0 && !res.ok) {
      return NextResponse.json({ error: "Availability check failed", detail: json }, { status: res.status });
    }

    return NextResponse.json({ availability, raw: json });
  } catch (err) {
    console.error("[POST /api/medicine/availability]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
