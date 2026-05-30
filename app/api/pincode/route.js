import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pincode = searchParams.get("pincode");
  const lat     = searchParams.get("lat");
  const lon     = searchParams.get("lon");

  // ── Reverse geocode (lat/lon → address + pincode) ──
  if (lat && lon && !pincode) {
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "User-Agent": "desilink-app/1.0" }, cache: "no-store" }
      );
      const data = await res.json();
      const addr = data?.address || {};
      return NextResponse.json({
        city:        addr.city || addr.town || addr.village || addr.county || addr.district || "",
        state:       addr.state || "",
        pincode:     addr.postcode || "",
        addressText: data.display_name || "",
        lat:         parseFloat(lat),
        lon:         parseFloat(lon),
      });
    } catch (err) {
      return NextResponse.json({ city: "", state: "", pincode: "", addressText: "", lat: 0, lon: 0 });
    }
  }

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
  }

  // ── Forward: pincode → city/state via India Post ──
  try {
    const res  = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { cache: "no-store" });
    const data = await res.json();
    const po   = data?.[0]?.PostOffice?.[0];
    const city  = po?.District || po?.Division || po?.Block || "";
    const state = po?.State || "";
    if (city && state) {
      // Also get lat/lon for this pincode via Nominatim search
      let pLat = 0, pLon = 0;
      try {
        const gRes  = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`, { headers: { "User-Agent": "desilink-app/1.0" }, cache: "no-store" });
        const gData = await gRes.json();
        if (gData?.[0]) { pLat = parseFloat(gData[0].lat); pLon = parseFloat(gData[0].lon); }
      } catch {}
      return NextResponse.json({ city, state, pincode, lat: pLat, lon: pLon });
    }
  } catch {}

  // ── Fallback: Nominatim search by pincode ──
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&limit=1`, { headers: { "User-Agent": "desilink-app/1.0" }, cache: "no-store" });
    const data = await res.json();
    const item = data?.[0];
    if (item) {
      const rRes  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${item.lat}&lon=${item.lon}&format=json`, { headers: { "User-Agent": "desilink-app/1.0" }, cache: "no-store" });
      const rData = await rRes.json();
      const addr  = rData?.address || {};
      return NextResponse.json({
        city:  addr.city || addr.town || addr.village || addr.county || "",
        state: addr.state || "",
        pincode,
        lat:   parseFloat(item.lat),
        lon:   parseFloat(item.lon),
      });
    }
  } catch {}

  return NextResponse.json({ city: "", state: "", pincode, lat: 0, lon: 0 });
}
