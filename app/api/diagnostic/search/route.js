import { NextResponse } from "next/server";
import { PHARMACY_BASE, meradocHeadersWithToken } from "../../../../lib/meradoc-proxy";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q       = searchParams.get("q")       || "";
    const zipcode = searchParams.get("zipcode") || "";
    const page    = searchParams.get("page")    || "1";
    const limit   = searchParams.get("limit")   || "10";

    const res  = await fetch(
      `${PHARMACY_BASE}/search?q=${encodeURIComponent(q)}&zipcode=${encodeURIComponent(zipcode)}&page=${page}&limit=${limit}`,
      { headers: await meradocHeadersWithToken() }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
