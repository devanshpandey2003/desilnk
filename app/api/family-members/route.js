import { NextResponse } from "next/server";
import sql from "../../../lib/db";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS family_members (
      id SERIAL PRIMARY KEY,
      patient_id TEXT NOT NULL,
      member_account_id TEXT,
      name TEXT,
      phone_number TEXT,
      age INTEGER,
      dob TEXT,
      gender TEXT,
      relationship TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

    await ensureTable();
    const rows = await sql`
      SELECT * FROM family_members WHERE patient_id = ${patientId} ORDER BY created_at DESC
    `;
    return NextResponse.json({ members: rows });
  } catch (err) {
    console.error("[GET /api/family-members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { patientId, member, memberAccountId } = await request.json();
    if (!patientId || !member) return NextResponse.json({ error: "patientId and member required" }, { status: 400 });

    await ensureTable();
    await sql`
      INSERT INTO family_members (patient_id, member_account_id, name, phone_number, age, dob, gender, relationship)
      VALUES (${patientId}, ${memberAccountId ?? null}, ${member.name}, ${member.phoneNumber},
              ${member.age ?? null}, ${member.dob ?? null}, ${member.gender}, ${member.relationship})
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/family-members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await sql`DELETE FROM family_members WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/family-members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
