import { NextResponse } from "next/server";

const MERADOC_BASE = "https://apidev.meradoc.com";
const ORIGIN_TOKEN = "ea905fcbecccb788fdde2651cf4ff7d1";
const X_API_ID     = "PVMD-01";
const X_API_TOKEN  = "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu";

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

// GET /api/medicine/order/status?orderId=MDM-1827
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader ? authHeader.replace("Bearer ", "") : await getAccessToken();

    const meraRes = await fetch(`${MERADOC_BASE}/go/api/v1/pharmacy/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "originToken":   ORIGIN_TOKEN,
        "Content-Type":  "application/json",
      },
    });

    const meraJson = await meraRes.json();
    return NextResponse.json(meraJson, { status: meraRes.status });
  } catch (err) {
    console.error("[GET /api/medicine/order/status]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
