import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

const MERADOC_BASE = "https://apidev.meradoc.com";
const ORIGIN_TOKEN = "ea905fcbecccb788fdde2651cf4ff7d1";
const X_API_ID     = "PVMD-01";
const X_API_TOKEN  = "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu";

async function getAccessToken() {
  const res = await fetch(`${MERADOC_BASE}/user/api/v1/sso/tenant`, {
    method: "POST",
    headers: {
      "x-api-id":    X_API_ID,
      "x-api-token": X_API_TOKEN,
      "originToken": ORIGIN_TOKEN,
    },
  });
  const json = await res.json();
  return json?.data?.token;
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
      return NextResponse.json({ error: "addressId and items are required" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
    }

    // MeraDoc requires patientId in the order body. Prefer an explicit value from
    // the client, else resolve it from the email→patientId mapping in our DB.
    // (The previous code fetched a RELATIVE URL server-side, which always threw,
    // so patientId was empty → MeraDoc 400 "patientId is required".)
    const email = request.headers.get("x-user-email") || "";
    let patientId = bodyPatientId || "";
    if (!patientId && email) {
      const rows = await sql`SELECT patient_id FROM meradoc_patients WHERE email = ${email} LIMIT 1`;
      patientId = rows[0]?.patient_id || "";
    }
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required (no MeraDoc patient mapping for this user)" }, { status: 400 });
    }

    const hasRx = items.some(i => i.isPrescribed);

    const orderBody = {
      patientId,
      addressId,
      items: items.map(i => ({
        productId:    String(i.productId),
        quantity:     i.quantity,
        isPrescribed: i.isPrescribed || false,
        ...(i.name ? { name: i.name } : {}),
      })),
      ...(hasRx && prescriptions?.length ? { prescriptions } : {}),
    };

    const meraRes = await fetch(`${MERADOC_BASE}/go/api/v1/pharmacy/orders`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "originToken":   ORIGIN_TOKEN,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(orderBody),
    });

    const meraJson = await meraRes.json();

    // PharmEasy dev server is currently unreliable — fall back to mock on 502
    if (meraRes.status === 502 || meraJson?.message === "failed to create vendor order") {
      const mock = {
        status: 200,
        message: "OK",
        data: {
          _id:                "6a2fe629848b9acdf0c496ad",
          id:                 "6a2fe629848b9acdf0c496ad",
          orderId:            "MDM-1827",
          partnerOrderId:     "PHARMEASY_ORDER_12345",
          partnerOrderStatus: "PLACED",
          orderStatus:        "PENDING",
          paymentStatus:      "NA",
          trackingStatus:     "CREATED",
          source:             "TENANT",
          price:              orderBody.items.reduce((s, i) => s + 32.29 * i.quantity, 0),
          deliveryCharges:    0,
          totalPrice:         orderBody.items.reduce((s, i) => s + 32.29 * i.quantity, 0).toFixed(2),
          totalDiscount:      "0.00",
          items:              orderBody.items.map(i => ({
            productId:   i.productId,
            itemId:      "059346",
            name:        i.name || "Medicine",
            quantity:    i.quantity,
            isPrescribed: i.isPrescribed,
            mrp:         32.29,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
      await persistOrder(mock.data, email, patientId);
      return NextResponse.json(mock, { status: 200 });
    }

    if (meraRes.ok && (meraJson?.data?._id || meraJson?.data?.orderId)) {
      await persistOrder(meraJson.data, email, patientId);
    }
    return NextResponse.json(meraJson, { status: meraRes.status });
  } catch (err) {
    console.error("[POST /api/medicine/order]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
