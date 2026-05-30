import { NextResponse } from "next/server";
import sql from "../../../lib/db";
import { PHARMACY_BASE, meradocHeadersWithToken } from "../../../lib/meradoc-proxy";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) return NextResponse.json({ orders: [] });

    const rows = await sql`
      SELECT order_id, raw_data, updated_at
      FROM lab_test_orders
      WHERE email = ${email}
      ORDER BY updated_at DESC
    `;

    if (rows.length === 0) return NextResponse.json({ orders: [] });

    // Fetch live status from MeraDoc for each order
    const headers = await meradocHeadersWithToken();
    const orders  = await Promise.all(
      rows.map(async (row) => {
        const fallback = (row.raw_data?.data?.orderStatus || "BOOKED").toUpperCase();
        // MeraDoc GET /order/:id requires MongoDB ObjectId, not DIAG-XXX
        const mongoId = row.raw_data?.data?._id || row.raw_data?.data?.id || row.order_id;
        try {
          const res  = await fetch(`${PHARMACY_BASE}/order/${mongoId}`, { headers });
          const data = await res.json();
          const live = (data?.data?.orderStatus || data?.orderStatus || "").toUpperCase();
          console.log(`[lab-status] ${row.order_id} (${mongoId}) → ${live || fallback}`);
          return { ...row, status: live || fallback, raw_data: data?.data ? data : row.raw_data };
        } catch {
          return { ...row, status: fallback };
        }
      })
    );

    return NextResponse.json({ orders });
  } catch (err) {
    if (err.message?.includes("does not exist")) return NextResponse.json({ orders: [] });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
