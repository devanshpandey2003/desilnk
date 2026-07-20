import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

const MERADOC_BASE = "https://apidev.meradoc.com";
const ORIGIN_TOKEN = "ea905fcbecccb788fdde2651cf4ff7d1";
const X_API_ID     = "PVMD-01";
const X_API_TOKEN  = "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu";

// Returns a token, or null if MeraDoc is unreachable/down (never throws)
async function getAccessToken() {
  try {
    const res = await fetch(`${MERADOC_BASE}/user/api/v1/sso/tenant`, {
      method: "POST",
      headers: {
        "x-api-id":    X_API_ID,
        "x-api-token": X_API_TOKEN,
        "originToken": ORIGIN_TOKEN,
      },
    });
    const json = await res.json().catch(() => ({}));
    return json?.data?.token || null;
  } catch {
    return null;
  }
}

// Persist a placed order so it can be listed later (MeraDoc has no list endpoint).
// Mirrors lab_test_orders: keyed by order_id, upserted, stores the full order data.
async function persistOrder(data, email, patientId) {
  const orderId = data?.orderId || data?._id;
  if (!orderId) return;
  const mongoId = data?._id || data?.id || null;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS medicine_orders (
        id         SERIAL PRIMARY KEY,
        order_id   TEXT UNIQUE NOT NULL,
        mongo_id   TEXT,
        email      TEXT,
        patient_id TEXT,
        raw_data   JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      INSERT INTO medicine_orders (order_id, mongo_id, email, patient_id, raw_data, updated_at)
      VALUES (${orderId}, ${mongoId}, ${email || null}, ${patientId || null}, ${JSON.stringify(data)}, NOW())
      ON CONFLICT (order_id) DO UPDATE SET
        raw_data   = EXCLUDED.raw_data,
        mongo_id   = EXCLUDED.mongo_id,
        email      = COALESCE(medicine_orders.email, EXCLUDED.email),
        updated_at = NOW()
    `;
  } catch (e) {
    console.error("[persistOrder]", e);
  }
}

// POST /api/medicine/order
// Body: { addressId, items: [{ productId, quantity, isPrescribed }] }
export async function POST(request) {
  try {
    const { addressId, items, prescriptions, patientId: bodyPatientId } = await request.json();

    if (!addressId || !items?.length) {
      return NextResponse.json({
        error:   true,
        source:  "desilink",
        message: "Missing delivery address or cart items. Please try again.",
      }, { status: 400 });
    }

    // Use the client's token if present; otherwise generate one server-side.
    // (The client token expires in 1h — the getAccessToken fallback keeps the
    // flow working even if the browser token is stale/missing.)
    let authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      const t = await getAccessToken();
      if (t) {
        authHeader = `Bearer ${t}`;
      } else {
        // Couldn't authenticate — MeraDoc's auth endpoint is down/unreachable
        return NextResponse.json({
          error:   true,
          source:  "meradoc",
          message: "MeraDoc authentication is currently unavailable. Please try again later.",
        }, { status: 503 });
      }
    }

    // MeraDoc requires patientId in the order body. Prefer an explicit value from
    // the client (request body or x-patient-id header), else resolve it from the
    // email→patientId mapping in our DB. (A relative fetch fails in a server route.)
    const email   = request.headers.get("x-user-email") || "";
    let patientId = bodyPatientId || request.headers.get("x-patient-id") || "";
    if (!patientId && email) {
      try {
        const rows = await sql`SELECT patient_id FROM meradoc_patients WHERE email = ${email} LIMIT 1`;
        patientId = rows[0]?.patient_id || "";
      } catch (e) {
        console.error("[order] patientId lookup failed", e);
      }
    }

    const hasRx = items.some(i => i.isPrescribed);

    const orderBody = {
      patientId,
      addressId,
      items: items.map(i => ({
        productId:    String(i.productId),
        name:         i.name || "",
        quantity:     i.quantity,
        isPrescribed: i.isPrescribed || false,
      })),
      ...(hasRx && prescriptions?.length ? { prescriptions } : {}),
    };

    const postOrder = (auth) => fetch(`${MERADOC_BASE}/go/api/v1/pharmacy/orders`, {
      method: "POST",
      headers: {
        "Authorization": auth,
        "originToken":   ORIGIN_TOKEN,
        "x-api-id":      X_API_ID,
        "x-api-token":   X_API_TOKEN,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(orderBody),
    });

    let meraRes, meraJson;
    try {
      meraRes  = await postOrder(authHeader);
      meraJson = await meraRes.json().catch(() => ({}));

      // If the client token was stale (401), regenerate server-side and retry once
      if (meraRes.status === 401) {
        const fresh = await getAccessToken();
        if (fresh) {
          meraRes  = await postOrder(`Bearer ${fresh}`);
          meraJson = await meraRes.json().catch(() => ({}));
        }
      }
    } catch (netErr) {
      // Could not reach MeraDoc at all (server down / network)
      console.error("[order] MeraDoc unreachable", netErr);
      return NextResponse.json({
        error:   true,
        source:  "meradoc",
        message: "MeraDoc server is currently unreachable. Please try again later.",
      }, { status: 503 });
    }

    // ── Success ──────────────────────────────────────────────────────────────
    if (meraRes.ok && (meraJson?.status === 200 || meraJson?.data?._id || meraJson?.data?.orderId)) {
      // Persist so the order is listable in Profile → Medicine Orders (DB-backed,
      // since MeraDoc has no list endpoint).
      await persistOrder(meraJson.data, email, patientId);
      return NextResponse.json(meraJson, { status: 200 });
    }

    // ── Failure — attribute the blame honestly ───────────────────────────────
    const msg = (meraJson?.message || "").toLowerCase();

    // External partner (PharmEasy) failed to create the vendor order
    if (meraRes.status === 502 || msg.includes("vendor") || msg.includes("pharmeasy") || msg.includes("partner")) {
      return NextResponse.json({
        error:   true,
        source:  "external",
        message: "Our pharmacy partner (PharmEasy) could not process the order right now. Please try again later.",
        detail:  meraJson?.message || null,
      }, { status: 502 });
    }

    // MeraDoc server unavailable (503 / gateway)
    if (meraRes.status === 503 || meraRes.status === 504) {
      return NextResponse.json({
        error:   true,
        source:  "meradoc",
        message: "MeraDoc server is temporarily unavailable. Please try again later.",
        detail:  meraJson?.message || null,
      }, { status: meraRes.status });
    }

    // Any other MeraDoc response (validation / auth / business rules) — surface its message
    return NextResponse.json({
      error:   true,
      source:  "meradoc",
      message: meraJson?.message || "MeraDoc rejected the order.",
      detail:  meraJson?.message || null,
    }, { status: meraRes.status || 400 });

  } catch (err) {
    // Anything thrown inside our own route = Desilink server error
    console.error("[POST /api/medicine/order]", err);
    return NextResponse.json({
      error:   true,
      source:  "desilink",
      message: "Desilink server error while placing the order. Please try again.",
    }, { status: 500 });
  }
}
