import { NextResponse } from "next/server";
import sql from "../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId");

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT status, sub_status, created_at
      FROM appointment_status_updates
      WHERE appointment_mongo_id = ${appointmentId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return NextResponse.json({ statusUpdate: rows[0] || null });
  } catch (err) {
    if (err.message?.includes("does not exist")) {
      return NextResponse.json({ statusUpdate: null });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
