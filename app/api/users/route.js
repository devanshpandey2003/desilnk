import { NextResponse } from "next/server";
import sql from "../../../lib/db";

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
