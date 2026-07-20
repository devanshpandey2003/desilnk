import { NextResponse } from "next/server";
import { getServerToken } from "../../../lib/meradoc-proxy";

// Same-origin proxy for MeraDoc's /user/api/v1/sso/tenant.
// MeraDoc returns NO CORS headers, so a direct browser call is blocked by the
// browser (shows as a failed request with "provisional headers"). We mint the
// tenant token server-side here and hand it back — mirroring MeraDoc's shape
// { data: { token } } so existing callers keep working unchanged.
export async function POST() {
  try {
    const token = await getServerToken();
    if (!token) {
      return NextResponse.json({ error: "Failed to generate token" }, { status: 502 });
    }
    return NextResponse.json({ data: { token } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
