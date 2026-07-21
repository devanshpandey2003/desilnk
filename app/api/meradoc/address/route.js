import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

const MERADOC_BASE   = "https://apidev.meradoc.com";
const ORIGIN_TOKEN   = "ea905fcbecccb788fdde2651cf4ff7d1";
const X_API_ID       = "PVMD-01";
const X_API_TOKEN    = "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu";

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

// GET /api/meradoc/address?email=xxx — fetch stored MeraDoc addressId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const rows = await sql`
      SELECT meradoc_address_id FROM user_lt_locations WHERE email = ${email} LIMIT 1
    `;
    return NextResponse.json({ addressId: rows[0]?.meradoc_address_id || null });
  } catch (err) {
    console.error("[GET /api/meradoc/address]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/meradoc/address — update existing address in MeraDoc
export async function PUT(request) {
  try {
    const { email, patientId, location, addressId } = await request.json();
    if (!email || !patientId || !location || !addressId) {
      return NextResponse.json({ error: "email, patientId, location and addressId required" }, { status: 400 });
    }

    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Failed to get MeraDoc token" }, { status: 500 });

    const s = (v, fallback = "") => (v == null ? fallback : String(v));

    // MeraDoc requires non-empty district (and city). Geocoding (India Post /
    // Nominatim) can intermittently return an empty city, so fall back through
    // city → district → state → "N/A" rather than block the address save.
    const districtVal = location.district || location.city || location.state || "N/A";
    const cityVal     = location.city || location.district || location.state || "N/A";

    const body = {
      name:         s(location.name,         "Patient"),
      mobileNumber: s(location.mobileNumber, ""),
      lat:          s(location.lat,          "0"),
      long:         s(location.long,         "0"),
      addressLine1: s(location.addressLine1, ""),
      addressLine2: s(location.addressLine2 || location.addressLine1, "N/A"),
      district:     s(districtVal,           "N/A"),
      pincode:      s(location.pincode,      ""),
      city:         s(cityVal,               "N/A"),
      state:        s(location.state,        ""),
      country:      s(location.country,      "India"),
      addressType:  "HOME",
      userId:       patientId,
    };

    // Same as create — userId must be a query param, not just a body field.
    const meraRes = await fetch(`${MERADOC_BASE}/user/api/v1/user/address/update/${addressId}?userId=${encodeURIComponent(patientId)}`, {
      method:  "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "originToken":   ORIGIN_TOKEN,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    });

    const meraJson = await meraRes.json();
    if (!meraRes.ok) {
      return NextResponse.json({ error: "MeraDoc update failed", detail: meraJson }, { status: meraRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/meradoc/address]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/meradoc/address — create address in MeraDoc + store addressId in DB
export async function POST(request) {
  try {
    const { email, patientId, location } = await request.json();
    if (!email || !patientId || !location) {
      return NextResponse.json({ error: "email, patientId and location required" }, { status: 400 });
    }

    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Failed to get MeraDoc token" }, { status: 500 });

    const s = (v, fallback = "") => (v == null ? fallback : String(v));

    // MeraDoc requires non-empty district (and city). Geocoding (India Post /
    // Nominatim) can intermittently return an empty city, so fall back through
    // city → district → state → "N/A" rather than block the address save.
    const districtVal = location.district || location.city || location.state || "N/A";
    const cityVal     = location.city || location.district || location.state || "N/A";

    const body = {
      name:         s(location.name,         "Patient"),
      mobileNumber: s(location.mobileNumber, ""),
      lat:          s(location.lat,          "0"),
      long:         s(location.long,         "0"),
      addressLine1: s(location.addressLine1, ""),
      addressLine2: s(location.addressLine2 || location.addressLine1, "N/A"),
      district:     s(districtVal,           "N/A"),
      pincode:      s(location.pincode,      ""),
      city:         s(cityVal,               "N/A"),
      state:        s(location.state,        ""),
      country:      s(location.country,      "India"),
      addressType:  "HOME",
      userId:       patientId,
    };

    // MeraDoc resolves the user from the ?userId query param (a tenant token
    // carries no patient id), not from the body — without it: "User Id is required".
    const meraRes = await fetch(`${MERADOC_BASE}/user/api/v1/user/address/create?userId=${encodeURIComponent(patientId)}`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "originToken":   ORIGIN_TOKEN,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(body),
    });

    const meraJson = await meraRes.json();
    const addressId = meraJson?.data?._id || meraJson?.data?.id;

    if (!addressId) {
      return NextResponse.json({ error: "MeraDoc did not return an addressId", detail: meraJson }, { status: 502 });
    }

    // Store addressId in our DB alongside the existing address
    await sql`
      UPDATE user_lt_locations
      SET meradoc_address_id = ${addressId}
      WHERE email = ${email}
    `;

    return NextResponse.json({ success: true, addressId });
  } catch (err) {
    console.error("[POST /api/meradoc/address]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
