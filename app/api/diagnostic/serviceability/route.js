import { NextResponse } from "next/server";
import { PHARMACY_BASE, meradocHeadersWithToken } from "../../../../lib/meradoc-proxy";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const zipcode = searchParams.get("zipcode");
    const lat     = searchParams.get("lat");
    const long    = searchParams.get("long");

    const res  = await fetch(
      `${PHARMACY_BASE}/checkServiceability?zipcode=${zipcode}&lat=${lat}&long=${long}`,
      { headers: await meradocHeadersWithToken() }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
