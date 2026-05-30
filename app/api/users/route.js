import { NextResponse } from "next/server";
import sql from "../../../lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT email, phone, name, country, dob, gender FROM users WHERE email = ${email} LIMIT 1
    `;

    return NextResponse.json({ user: rows[0] || null });
  } catch (err) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ user: null });
  }
}

export async function PATCH(request) {
  try {
    const { email, name, country, dob, bloodGroup, gender } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    // Add optional columns if they don't exist yet
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS dob TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT`;

    await sql`
      UPDATE users
      SET name        = COALESCE(${name ?? null}, name),
          country     = COALESCE(${country ?? null}, country),
          dob         = COALESCE(${dob ?? null}, dob),
          blood_group = COALESCE(${bloodGroup ?? null}, blood_group),
          gender      = COALESCE(${gender ?? null}, gender)
      WHERE email = ${email}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { email, phone, name, country } = await request.json();

    if (!email || !phone || !name || !country) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await sql`
      INSERT INTO users (email, phone, name, country)
      VALUES (${email}, ${phone}, ${name}, ${country})
      ON CONFLICT (email) DO UPDATE
        SET phone   = EXCLUDED.phone,
            name    = EXCLUDED.name,
            country = EXCLUDED.country
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
