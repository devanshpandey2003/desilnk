import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[webhook] update-status:", JSON.stringify(body));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] update-status error:", err);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
