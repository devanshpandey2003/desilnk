import { NextResponse } from "next/server";

const MERADOC_BASE = "https://apidev.meradoc.com";
const X_API_ID     = "PVMD-01";
const X_API_TOKEN  = "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu";
const ORIGIN_TOKEN = "ea905fcbecccb788fdde2651cf4ff7d1";

// POST /api/medicine/availability
// Body: { pincode: "440001", ucodes: ["122665", "44140"] }
// Returns: { [ucode]: true | false, raw: [...] }
export async function POST(request) {
  try {
    const { pincode, ucodes } = await request.json();

    if (!pincode || !Array.isArray(ucodes) || ucodes.length === 0) {
      return NextResponse.json({ error: "pincode and ucodes[] required" }, { status: 400 });
    }

    const res = await fetch(`${MERADOC_BASE}/go/api/v1/drug/drugs/availability`, {
      method: "POST",
      headers: {
        "x-api-id":      X_API_ID,
        "x-api-token":   X_API_TOKEN,
        "originToken":   ORIGIN_TOKEN,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ pincode, ucodes }),
    });

    const json = await res.json();

    // Normalise to { [ucode]: boolean } so the UI doesn't need to know the raw shape
    const availability = {};
    const list = json?.data?.list || json?.data || [];
    if (Array.isArray(list)) {
      list.forEach(item => {
        const ucode = item.ucode || item.ucodes;
        if (ucode) {
          availability[String(ucode)] = item.availability === true
            || item.isAvailable === true
            || item.status === "AVAILABLE"
            || item.fulfilability === "IN_STOCK";
        }
      });
    }

    // If API returned nothing parseable, fall back to marking all as available
    // so a backend issue doesn't silently block the user
    if (Object.keys(availability).length === 0 && !res.ok) {
      return NextResponse.json({ error: "Availability check failed", detail: json }, { status: res.status });
    }

    return NextResponse.json({ availability, raw: json });
  } catch (err) {
    console.error("[POST /api/medicine/availability]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
