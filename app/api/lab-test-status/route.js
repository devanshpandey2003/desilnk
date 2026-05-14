import { NextResponse } from "next/server";
import sql from "../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT order_id, status, updated_at
      FROM lab_test_orders
      WHERE order_id = ${orderId}
      LIMIT 1
    `;

    return NextResponse.json({ order: rows[0] || null });
  } catch (err) {
    if (err.message?.includes("does not exist")) {
      return NextResponse.json({ order: null });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
