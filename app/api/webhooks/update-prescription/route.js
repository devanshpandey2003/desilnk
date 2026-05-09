import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[webhook] update-prescription:", JSON.stringify(body));

    await sql`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        appointment_mongo_id TEXT,
        appointment_display_id TEXT,
        patient_id TEXT,
        prescription_url TEXT,
        raw_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Payload shape: { appointmentId (mongo), appointmentDisplayId, patientId, prescription: { ... } }
    const appointmentMongoId = body.appointmentId ?? null;
    const appointmentDisplayId = body.appointmentDisplayId ?? null;
    const patientId = body.patientId ?? null;
    const prescriptionUrl = body.prescription?.prescriptionImgUrls?.[0] ?? null;

    await sql`
      INSERT INTO prescriptions
        (appointment_mongo_id, appointment_display_id, patient_id, prescription_url, raw_data)
      VALUES
        (${appointmentMongoId}, ${appointmentDisplayId}, ${patientId}, ${prescriptionUrl}, ${JSON.stringify(body)})
    `;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] update-prescription error:", err);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
