import { NextResponse } from "next/server";
import { PHARMACY_BASE, meradocHeadersWithToken } from "../../../../../lib/meradoc-proxy";

export async function GET(request, { params }) {
  try {
    const { orderId } = await params;
    const res  = await fetch(`${PHARMACY_BASE}/order/${orderId}`, {
      headers: await meradocHeadersWithToken(),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
