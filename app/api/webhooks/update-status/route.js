import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[webhook] update-status:", JSON.stringify(body));

    await sql`
      CREATE TABLE IF NOT EXISTS appointment_status_updates (
        id SERIAL PRIMARY KEY,
        appointment_mongo_id TEXT,
        status TEXT,
        sub_status TEXT,
        other_details TEXT,
        raw_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO appointment_status_updates
        (appointment_mongo_id, status, sub_status, other_details, raw_data)
      VALUES
        (${body.appointmentId ?? null},
         ${body.status ?? null},
         ${body.subStatus ?? null},
         ${body.otherDetails ?? null},
         ${JSON.stringify(body)})
    `;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] update-status error:", err);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
