import { NextResponse } from "next/server";
import sql from "../../../lib/db";

export async function GET(request) {
  try {
    const email = new URL(request.url).searchParams.get("email");
    if (!email) return NextResponse.json({ location: null });
    const rows = await sql`SELECT location FROM user_lt_locations WHERE email = ${email} LIMIT 1`;
    return NextResponse.json({ location: rows[0]?.location || null });
  } catch (err) {
    return NextResponse.json({ location: null });
  }
}

export async function POST(request) {
  try {
    const { email, location } = await request.json();
    if (!email || !location) return NextResponse.json({ success: false }, { status: 400 });
    await sql`
      INSERT INTO user_lt_locations (email, location, updated_at)
      VALUES (${email}, ${JSON.stringify(location)}, NOW())
      ON CONFLICT (email) DO UPDATE SET location = EXCLUDED.location, updated_at = NOW()
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
