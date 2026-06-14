import { NextResponse } from "next/server";

const MERADOC_BASE = "https://apidev.meradoc.com";
const X_API_ID     = "PVMD-01";
const X_API_TOKEN  = "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu";
const ORIGIN_TOKEN = "ea905fcbecccb788fdde2651cf4ff7d1";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search  = searchParams.get("search")  || "";
    const pincode = searchParams.get("pincode") || "400001";
    const page    = searchParams.get("page")    || "1";
    const size    = searchParams.get("size")    || "20";

    if (!search.trim()) return NextResponse.json({ data: { list: [], pageMeta: {} } });

    const res = await fetch(
      `${MERADOC_BASE}/go/api/v1/drug/drugs?search=${encodeURIComponent(search)}&pincode=${pincode}&page=${page}&size=${size}&medType=`,
      { headers: { "x-api-id": X_API_ID, "x-api-token": X_API_TOKEN, "originToken": ORIGIN_TOKEN } }
    );
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    console.error("[GET /api/medicine/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
