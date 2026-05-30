import { NextResponse } from "next/server";
import { PHARMACY_BASE, meradocHeadersWithToken } from "../../../../lib/meradoc-proxy";
import sql from "../../../../lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, ...bookingPayload } = body;

    // Call MeraDoc with a fresh server-side token so partner is always resolved
    console.log("[book] payload →", JSON.stringify(bookingPayload, null, 2));
    const res  = await fetch(`${PHARMACY_BASE}/bookLabTest`, {
      method:  "POST",
      headers: await meradocHeadersWithToken(),
      body:    JSON.stringify(bookingPayload),
    });
    const data = await res.json();
    if (!res.ok) console.log("[book] MeraDoc error ←", res.status, JSON.stringify(data, null, 2));

    // Store only enough to map this order back to the user (email → order list)
    // Status is never tracked here — always fetched live from MeraDoc using raw_data.data._id
    const orderId = data?.data?.orderId || data?.data?._id || data?.orderId || data?._id;
    if (orderId) {
      await sql`
        CREATE TABLE IF NOT EXISTS lab_test_orders (
          id         SERIAL PRIMARY KEY,
          order_id   TEXT UNIQUE NOT NULL,
          email      TEXT,
          raw_data   JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      await sql`
        INSERT INTO lab_test_orders (order_id, email, raw_data, updated_at)
        VALUES (${orderId}, ${email || null}, ${JSON.stringify(data)}, NOW())
        ON CONFLICT (order_id) DO UPDATE
          SET raw_data   = EXCLUDED.raw_data,
              updated_at = NOW()
      `;
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
