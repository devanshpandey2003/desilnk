import { NextResponse } from "next/server";
import sql from "../../../../lib/db";
import { getServerToken } from "../../../../lib/meradoc-proxy";

const MERADOC_BASE = "https://apidev.meradoc.com";
const ORIGIN_TOKEN = "ea905fcbecccb788fdde2651cf4ff7d1";
const X_API_ID     = "PVMD-01";
const X_API_TOKEN  = "aZ7tQp3R9mX2bL6vWfH1sE8nYcD4jKu";

// GET /api/medicine/orders?email=xxx
// Lists a user's medicine orders from our DB, with best-effort live status from
// MeraDoc. MeraDoc has no list endpoint and its by-id lookup is unreliable on dev
// (returns "Order Not Found"), so the stored order is always the fallback source.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    if (!email) return NextResponse.json({ orders: [] });

    const rows = await sql`
      SELECT order_id, mongo_id, raw_data, updated_at
      FROM medicine_orders
      WHERE email = ${email}
      ORDER BY updated_at DESC
    `;
    if (rows.length === 0) return NextResponse.json({ orders: [] });

    const token = await getServerToken();
    const orders = await Promise.all(
      rows.map(async (row) => {
        const stored   = row.raw_data || {};
        const fallback = (stored.orderStatus || stored.status || "PENDING").toUpperCase();
        const lookupId = row.mongo_id || stored._id || row.order_id;
        try {
          const res  = await fetch(`${MERADOC_BASE}/go/api/v1/pharmacy/orders/${lookupId}`, {
            headers: {
              "Authorization": `Bearer ${token}`,
              "x-api-id":      X_API_ID,
              "x-api-token":   X_API_TOKEN,
              "originToken":   ORIGIN_TOKEN,
            },
          });
          const data = await res.json();
          if (res.ok && data?.data) {
            const live = data.data;
            return {
              order_id:   row.order_id,
              updated_at: row.updated_at,
              status:     (live.orderStatus || fallback).toUpperCase(),
              order:      live,
            };
          }
        } catch {}
        return { order_id: row.order_id, updated_at: row.updated_at, status: fallback, order: stored };
      })
    );

    return NextResponse.json({ orders });
  } catch (err) {
    if (err.message?.includes("does not exist")) return NextResponse.json({ orders: [] });
    console.error("[GET /api/medicine/orders]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
