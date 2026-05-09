import { NextResponse } from "next/server";
import sql from "../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId");
    const patientId = searchParams.get("patientId");

    if (!appointmentId && !patientId) {
      return NextResponse.json({ error: "appointmentId or patientId required" }, { status: 400 });
    }

    let rows;
    if (appointmentId) {
      rows = await sql`
        SELECT * FROM prescriptions
        WHERE appointment_mongo_id = ${appointmentId}
           OR appointment_display_id = ${appointmentId}
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT * FROM prescriptions
        WHERE patient_id = ${patientId}
        ORDER BY created_at DESC
      `;
    }

    return NextResponse.json({ prescriptions: rows });
  } catch (err) {
    console.error("[GET /api/prescriptions]", err);
    if (err.message?.includes("does not exist")) {
      return NextResponse.json({ prescriptions: [] });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
