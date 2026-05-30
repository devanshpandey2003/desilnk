import { NextResponse } from "next/server";
import { PHARMACY_BASE, meradocHeaders } from "../../../../lib/meradoc-proxy";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[cancel] payload →", JSON.stringify(body));
    const headers = meradocHeaders(request); // forward the client's fresh tenant token
    console.log("[cancel] auth →", headers.Authorization ? headers.Authorization.slice(0, 40) + "…" : "EMPTY – token missing from client");
    const res  = await fetch(`${PHARMACY_BASE}/cancelOrder`, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) console.log("[cancel] MeraDoc error ←", res.status, JSON.stringify(data));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
