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

// POST /api/meradoc/address — create address in MeraDoc + store addressId in DB
export async function POST(request) {
  try {
    const { email, patientId, location } = await request.json();
    if (!email || !patientId || !location) {
      return NextResponse.json({ error: "email, patientId and location required" }, { status: 400 });
    }

    const token = await getAccessToken();
    if (!token) return NextResponse.json({ error: "Failed to get MeraDoc token" }, { status: 500 });

    const body = {
      name:         location.name         || "Patient",
      mobileNumber: location.mobileNumber || "",
      lat:          String(location.lat   || "0"),
      long:         String(location.long  || "0"),
      addressLine1: location.addressLine1 || "",
      addressLine2: location.addressLine2 || "",
      district:     location.district     || location.city || "",
      pincode:      String(location.pincode || ""),
      city:         location.city         || "",
      state:        location.state        || "",
      country:      location.country      || "India",
      addressType:  "HOME",
      userId:       patientId,
    };

    const meraRes = await fetch(`${MERADOC_BASE}/user/api/v1/user/address/create`, {
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
