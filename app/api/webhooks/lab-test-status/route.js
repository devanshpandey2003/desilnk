import { NextResponse } from "next/server";
import sql from "../../../../lib/db";
import { PHARMACY_BASE, meradocHeadersWithToken } from "../../../../lib/meradoc-proxy";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[webhook] lab-test-status:", JSON.stringify(body));

    const orderId = body.orderId || body.order_id || body.bookingId;
    if (!orderId) {
      return NextResponse.json({ success: false, error: "orderId required" }, { status: 200 });
    }

    // Check if we already have this order in DB (with email)
    const existing = await sql`
      SELECT order_id, email FROM lab_test_orders WHERE order_id = ${orderId} LIMIT 1
    `;

    // Fetch full order from MeraDoc to get raw_data including email
    let rawData = body;
    let email = existing[0]?.email || null;
    try {
      const headers = await meradocHeadersWithToken();
      const res  = await fetch(`${PHARMACY_BASE}/order/${orderId}`, { headers });
      const data = await res.json();
      if (data?.data) {
        rawData = data;
        // Extract email from MeraDoc order data
        email = email || data.data.emailId || data.data.email || null;
      }
    } catch {}

    // Upsert into lab_test_orders using correct schema (no status column)
    await sql`
      INSERT INTO lab_test_orders (order_id, email, raw_data, updated_at)
      VALUES (${orderId}, ${email}, ${JSON.stringify(rawData)}, NOW())
      ON CONFLICT (order_id) DO UPDATE SET
        raw_data   = EXCLUDED.raw_data,
        email      = COALESCE(lab_test_orders.email, EXCLUDED.email),
        updated_at = NOW()
    `;

    console.log("[webhook] upserted order", orderId, "email:", email);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] lab-test-status error:", err);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
