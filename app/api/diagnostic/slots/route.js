import { NextResponse } from "next/server";
import { PHARMACY_BASE, meradocHeadersWithToken } from "../../../../lib/meradoc-proxy";

export async function POST(request) {
  try {
    const body = await request.json();
    const res  = await fetch(`${PHARMACY_BASE}/getPhleboSlots`, {
      method:  "POST",
      headers: await meradocHeadersWithToken(),
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
