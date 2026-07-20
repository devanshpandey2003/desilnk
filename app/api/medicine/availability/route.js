import { NextResponse } from "next/server";
import { getServerToken } from "../../../../lib/meradoc-proxy";

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

    // This endpoint requires a Bearer token — without it MeraDoc returns 401.
    // Prefer the client's token if sent, else mint a fresh server-side tenant token.
    const authHeader = request.headers.get("Authorization");
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : await getServerToken();

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
    // MeraDoc returns the array under data.items (older shapes used data.list)
    const list = json?.data?.items || json?.data?.list || json?.data || [];
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

    // A real out-of-stock product IS returned in items[] with availability:false.
    // A requested ucode MISSING from items means MeraDoc's provider (PEMD-01 /
    // PharmEasy) couldn't check it — it returns "provider unavailable" in
    // data.errors, sometimes as a whole-request 502. That is NOT "out of stock"
    // (search already lists these as IN_STOCK), so treat any ucode we couldn't
    // verify as available/orderable rather than block the user, and flag that the
    // provider didn't fully respond so the UI can soften the label if it wants.
    let providerUnavailable = !res.ok ||
      (Array.isArray(json?.data?.errors) && json.data.errors.length > 0);

    ucodes.forEach((u) => {
      if (availability[String(u)] === undefined) {
        availability[String(u)] = true; // couldn't verify → assume orderable
        providerUnavailable = true;
      }
    });

    // Return a clean map the UI can use directly. We deliberately do NOT pass
    // MeraDoc's raw payload through — when the provider fails it contains a 502
    // "provider unavailable" body that looks like an error even though this
    // response is a successful 200 fallback.
    return providerUnavailable
      ? NextResponse.json({ availability, providerUnavailable: true })
      : NextResponse.json({ availability });
  } catch (err) {
    console.error("[POST /api/medicine/availability]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
