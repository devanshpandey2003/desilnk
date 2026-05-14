import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

// Status progression order (for display)
export const LAB_STATUSES = [
  "PHLEBO_ASSIGNED",
  "SAMPLE_COLLECTED",
  "REPORT_GENERATED",
  "COMPLETED",
];

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[webhook] lab-test-status:", JSON.stringify(body));

    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, error: "orderId and status are required" }, { status: 200 });
    }

    await sql`
      CREATE TABLE IF NOT EXISTS lab_test_orders (
        id SERIAL PRIMARY KEY,
        order_id TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL,
        raw_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Upsert — always keep the latest status for an orderId
    await sql`
      INSERT INTO lab_test_orders (order_id, status, raw_data, updated_at)
      VALUES (${orderId}, ${status}, ${JSON.stringify(body)}, NOW())
      ON CONFLICT (order_id)
      DO UPDATE SET
        status     = EXCLUDED.status,
        raw_data   = EXCLUDED.raw_data,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] lab-test-status error:", err);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
