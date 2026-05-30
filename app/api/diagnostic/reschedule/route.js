import { NextResponse } from "next/server";
import { PHARMACY_BASE, meradocHeaders } from "../../../../lib/meradoc-proxy";

export async function POST(request) {
  try {
    const body = await request.json();
    const res  = await fetch(`${PHARMACY_BASE}/rescheduleOrder`, {
      method:  "POST",
      headers: meradocHeaders(request), // forward the client's fresh tenant token
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) console.log("[reschedule] MeraDoc error ←", res.status, JSON.stringify(data));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
