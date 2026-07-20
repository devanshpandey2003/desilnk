import { NextResponse } from "next/server";

const MERADOC_BASE = "https://apidev.meradoc.com";

// Static tenant credentials — kept server-side only, never shipped to the browser.
const STATIC_HEADERS = {
  "x-api-id": "PVMD-01",
  "x-api-token": "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu",
  originToken: "ea905fcbecccb788fdde2651cf4ff7d1",
};

// Generic same-origin reverse proxy for MeraDoc.
// MeraDoc sends no CORS headers, so a direct browser call is blocked by the
// browser. The axios client (lib/api.js) points its baseURL here, so every
// call like GET /user/api/v1/doctor/findDoctor becomes
// GET /api/mera/user/api/v1/doctor/findDoctor and is forwarded server-side.
async function proxy(request, ctx) {
  try {
    const { path = [] } = await ctx.params;
    const { search } = new URL(request.url);
    const target = `${MERADOC_BASE}/${path.join("/")}${search}`;

    const headers = { ...STATIC_HEADERS };
    // Forward the per-user token (added by the axios request interceptor).
    const auth = request.headers.get("authorization");
    if (auth) headers.Authorization = auth;
    // Forward the idempotency key used by appointment booking.
    const idem = request.headers.get("x-idempotency-key");
    if (idem) headers["X-Idempotency-Key"] = idem;

    let body;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
      headers["Content-Type"] = request.headers.get("content-type") || "application/json";
    }

    const res = await fetch(target, {
      method: request.method,
      headers,
      body: body || undefined,
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Proxy error" }, { status: 500 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
