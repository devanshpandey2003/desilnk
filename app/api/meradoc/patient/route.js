import { NextResponse } from "next/server";
import sql from "../../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT patient_id FROM meradoc_patients WHERE email = ${email} LIMIT 1
    `;

    return NextResponse.json({ patientId: rows[0]?.patient_id || null });
  } catch (err) {
    console.error("[GET /api/meradoc/patient]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { email, patientId } = await request.json();

    if (!email || !patientId) {
      return NextResponse.json({ error: "email and patientId are required" }, { status: 400 });
    }

    await sql`
      INSERT INTO meradoc_patients (email, patient_id)
      VALUES (${email}, ${patientId})
      ON CONFLICT (email) DO UPDATE SET patient_id = EXCLUDED.patient_id
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/meradoc/patient]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
