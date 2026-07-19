import { NextResponse } from "next/server";

const MERADOC_BASE = "https://apidev.meradoc.com";

// Static credentials injected server-side on every forwarded request.
// This avoids browser→MeraDoc CORS calls (MeraDoc does not send
// Access-Control-Allow-Origin, so direct browser calls are blocked).
// All service calls now go: browser → this proxy → MeraDoc.
const STATIC_HEADERS = {
  "x-api-id":    "PVMD-01",
  "x-api-token": "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu",
  "originToken": "ea905fcbecccb788fdde2651cf4ff7d1",
};

async function forward(request, params, method) {
  const segments = params.path || [];
  const path     = segments.join("/");
  const search   = new URL(request.url).search; // preserve query string
  const target   = `${MERADOC_BASE}/${path}${search}`;

  const headers = {
    ...STATIC_HEADERS,
    "Content-Type": "application/json",
    "Accept":       "application/json",
  };

  // Forward the caller's bearer token if present
  const auth = request.headers.get("Authorization");
  if (auth) headers.Authorization = auth;

  const init = { method, headers };

  if (method !== "GET" && method !== "DELETE") {
    const raw = await request.text();
    init.body = raw && raw.length ? raw : JSON.stringify({});
  }

  try {
    const res  = await fetch(target, init);
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    console.error(`[meradoc-proxy ${method} /${path}]`, err);
    return NextResponse.json({ error: "Proxy request failed" }, { status: 502 });
  }
}

export async function GET(request, { params })    { return forward(request, await params, "GET"); }
export async function POST(request, { params })   { return forward(request, await params, "POST"); }
export async function PUT(request, { params })    { return forward(request, await params, "PUT"); }
export async function PATCH(request, { params })  { return forward(request, await params, "PATCH"); }
export async function DELETE(request, { params }) { return forward(request, await params, "DELETE"); }
