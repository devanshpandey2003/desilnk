"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DiagnosticService } from "../../../services/diagnostic.service";
import { UserService } from "../../../services/user.service";
import "./lab-tests.css";

// ── helpers ───────────────────────────────────────────────────────────────────
function ageFromDob(dob) {
  if (!dob) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const birth = new Date(y, m - 1, d);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const dm = today.getMonth() - birth.getMonth();
  if (dm < 0 || (dm === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

function tomorrow() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function maxDate() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}
function fmtDate(str) {
  if (!str) return "";
  return new Date(str + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ── Address Step ──────────────────────────────────────────────────────────────
function AddressStep({ onDone }) {
  const [mode,     setMode]     = useState(null); // null | "gps" | "manual"
  const [address,  setAddress]  = useState("");
  const [pincode,  setPincode]  = useState("");
  const [coords,   setCoords]   = useState(null);
  const [locating, setLocating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error,    setError]    = useState("");

  const useGPS = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported by your browser."); return; }
    setMode("gps"); setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, long: lon });
        // Auto-fill address + pincode from reverse geocode
        try {
          const res  = await fetch(`/api/pincode?lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data.addressText) setAddress(data.addressText);
          if (data.pincode)     setPincode(data.pincode);
        } catch {}
        setLocating(false);
      },
      () => { setError("Location access denied. Please allow location or fill manually."); setLocating(false); setMode(null); }
    );
  };

  const canSubmit = address.trim() && pincode.length === 6 && (coords || mode === "manual");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setChecking(true); setError("");
    try {
      await UserService.generateToken();

      let lat = coords?.lat, lon = coords?.long;

      // Manual mode: get lat/lon from pincode
      if (mode === "manual" && !coords) {
        const pRes  = await fetch(`/api/pincode?pincode=${pincode}`);
        const pData = await pRes.json();
        lat = pData.lat || 0;
        lon = pData.lon || 0;
      }

      const [data, pinData] = await Promise.all([
        DiagnosticService.checkServiceability({ zipcode: pincode, lat, long: lon }),
        fetch(`/api/pincode?pincode=${pincode}&lat=${lat}&lon=${lon}`).then((r) => r.json()).catch(() => null),
      ]);

      const partners    = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : []);
      const serviceable = partners.length > 0 ? partners.some((p) => p.serviceable !== false) : (data?.isServiceable ?? true);
      if (serviceable === false) { setError("Home collection not available at this pincode yet."); return; }

      // Use any partner that has location IDs to resolve city/state name fallbacks
      const anyWithIds = partners.find((p) => p.zoneId) || partners[0] || {};
      const city  = anyWithIds.city  || pinData?.city  || "";
      const state = anyWithIds.state || pinData?.state || "";

      // Store full partners array so checkout can pick the right IDs per partner
      onDone({
        addressLine1: address.trim(), pincode, lat: String(lat), long: String(lon),
        city, state,
        partners: partners.map((p) => ({
          partner: p.partner || "",
          cityId:  p.cityId  != null ? String(p.cityId)  : "",
          stateId: p.stateId != null ? String(p.stateId) : "",
          zoneId:  p.zoneId  != null ? String(p.zoneId)  : "",
        })),
        // Keep flat fallbacks for slots API (uses zoneId from any partner)
        cityId:  anyWithIds.cityId  != null ? String(anyWithIds.cityId)  : city,
        stateId: anyWithIds.stateId != null ? String(anyWithIds.stateId) : state,
        zoneId:  anyWithIds.zoneId  != null ? String(anyWithIds.zoneId)  : "",
      });
    } catch (err) { setError(err.message || "Serviceability check failed."); }
    finally { setChecking(false); }
  };

  // Mode selection screen
  if (!mode) return (
    <div className="lt-address-wrap">
      <div className="lt-address-card animate-fade-in">
        <h2>Delivery Address</h2>
        <p className="lt-addr-sub">How would you like to set your delivery location?</p>
        {error && <p className="lt-error">{error}</p>}
        <div className="lt-addr-options">
          <button className="lt-addr-option-btn" onClick={useGPS}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a4fd4" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
            <span>Use my current location</span>
            <p>Automatically detect and fill your address</p>
          </button>
          <button className="lt-addr-option-btn" onClick={() => setMode("manual")}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a4fd4" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span>Fill address manually</span>
            <p>Type your house address and pincode</p>
          </button>
        </div>
      </div>
    </div>
  );

  // GPS locating spinner
  if (mode === "gps" && locating) return (
    <div className="lt-address-wrap">
      <div className="lt-address-card animate-fade-in" style={{ textAlign: "center" }}>
        <div className="apt-spinner-sm" style={{ margin: "1rem auto" }} />
        <p>Detecting your location…</p>
      </div>
    </div>
  );

  // Form (GPS pre-filled or manual)
  return (
    <div className="lt-address-wrap">
      <div className="lt-address-card animate-fade-in">
        <button className="lt-back-btn" style={{ marginBottom: "1rem" }} onClick={() => { setMode(null); setCoords(null); setAddress(""); setPincode(""); setError(""); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2>{mode === "gps" ? "Confirm Your Address" : "Enter Delivery Address"}</h2>
        {mode === "gps" && coords && <p className="lt-loc-hint">📍 Location detected — please confirm or edit below</p>}
        <form onSubmit={handleSubmit}>
          <textarea className="lt-input lt-textarea" placeholder="House / flat no., street, landmark…" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} />
          <input type="text" className="lt-input" placeholder="Pincode (6 digits)" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} />
          {error && <p className="lt-error">{error}</p>}
          <button type="submit" className="lt-btn-submit" disabled={!canSubmit || checking}>
            {checking ? "Checking availability…" : "Check & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Test result card (horizontal, matches MeraDoc UI) ─────────────────────────
function TestResultCard({ test, inCart, onAdd }) {
  const [expanded, setExpanded] = useState(false);
  const name    = test.name || test.packageName || "Test";
  const mrp     = Number(test.price || test.mrp || 0);
  const disc    = Number(test.offerPrice || test.offer_price || test.discountedPrice || test.discounted_price || mrp);
  const pct     = mrp > 0 && disc < mrp ? Math.round((1 - disc / mrp) * 100) : 0;
  const fasting = test.fastingText || test.fasting_text || (test.fastingRequired || test.fasting ? "Fasting required" : "No fasting needed");
  const desc    = test.description || test.details || "";
  const partner = test.partner || test.labPartner || test.partnerName || "";

  return (
    <div className="lt-result-card">
      <div className="lt-result-thumb">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/>
          <path d="M9 3a2 2 0 0 1 4 0M9 3h6"/>
          <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01"/>
        </svg>
      </div>
      <div className="lt-result-body">
        <h4 className="lt-result-name">{name}</h4>
        <div className="lt-result-price">
          {disc < mrp && <span className="lt-mrp">₹{mrp}</span>}
          <span className="lt-disc">₹{disc}</span>
          {pct > 0 && <span className="lt-badge">{pct}% OFF</span>}
        </div>
        {fasting && <p className="lt-fasting">{fasting}</p>}
        {desc && (
          <p className="lt-desc">
            {expanded ? desc : desc.slice(0, 120)}
            {desc.length > 120 && (
              <button className="lt-show-more" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                {expanded ? " Show less" : "... Show more"}
              </button>
            )}
          </p>
        )}
        {partner && <span className="lt-partner-tag">{partner}</span>}
      </div>
      <button className={`lt-add-btn ${inCart ? "lt-add-btn--added" : ""}`} onClick={() => onAdd(test)} disabled={inCart}>
        {inCart ? "✓ Added" : "+ Add"}
      </button>
    </div>
  );
}

const POPULAR = ["Thyroid Test", "CBC", "Diabetes", "Vitamin D", "Liver Function"];

// ── Main View (search + browse) ───────────────────────────────────────────────
function MainView({ location, cart, onAddToCart }) {
  const router = useRouter();
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [searching,setSearching]= useState(false);
  const [toast,    setToast]    = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const data = await DiagnosticService.searchTests({ q, zipcode: location.pincode });
      const list = data?.data?.tests || data?.data?.results ||
        (Array.isArray(data?.data) ? data.data : null) ||
        data?.results || (Array.isArray(data) ? data : []);
      setResults(list || []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [location.pincode]);

  useEffect(() => { const t = setTimeout(() => doSearch(query), 400); return () => clearTimeout(t); }, [query, doSearch]);

  const isInCart = (test) => cart.some((c) => (c._id && c._id === (test._id || test.id)) || (c.id && c.id === (test._id || test.id)));

  const handleAdd = (test) => {
    if (!isInCart(test)) {
      onAddToCart({ ...test, _id: test._id || test.id || String(Math.random()) });
      showToast("Test added to cart.");
    }
  };

  return (
    <div className="lt-main-wrap">
      {/* Toast */}
      {toast && <div className="lt-toast"><span>✅</span> {toast}</div>}

      {/* Floating cart button */}
      {cart.length > 0 && (
        <button className="lt-cart-fab" onClick={() => router.push("/consultancy/cart")}>
          🛒 &nbsp;{cart.length} {cart.length === 1 ? "test" : "tests"} in cart — View Cart
        </button>
      )}

      {/* Search */}
      <div className="lt-search-section">
        <div className="lt-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search for lab tests, packages, or health checkups..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="lt-popular-row">
          <span className="lt-popular-label">Popular:</span>
          {POPULAR.map((t) => <button key={t} className="lt-popular-chip" onClick={() => setQuery(t)}>{t}</button>)}
        </div>
      </div>

      {/* Search results */}
      {searching && <p className="lt-hint lt-indent">Searching…</p>}
      {!searching && results.length > 0 && (
        <div className="lt-result-list">
          {results.map((test, i) => (
            <TestResultCard key={test._id || test.id || i} test={test} inCart={isInCart(test)} onAdd={handleAdd} />
          ))}
        </div>
      )}
      {!searching && query.trim() && results.length === 0 && (
        <p className="lt-hint lt-indent">No results for &ldquo;{query}&rdquo;</p>
      )}

      {/* Default browse content */}
      {!query.trim() && (
        <>
          <div className="lt-feat-cards">
            <div className="lt-feat-card lt-feat-green">
              <div className="lt-feat-ico lt-feat-ico-green">🏠</div>
              <div><h4>Doorstep sample collection</h4><p>Have MeraDoc&apos;s team call with prices</p></div>
            </div>
            <div className="lt-feat-card lt-feat-purple">
              <div className="lt-feat-ico lt-feat-ico-purple">📋</div>
              <div><h4>Digital report within 24 hours</h4><p>Get your reports quickly and securely</p></div>
            </div>
            <div className="lt-feat-card lt-feat-blue">
              <div className="lt-feat-ico lt-feat-ico-blue">✅</div>
              <div><h4>100% certified</h4><p>Lab Partners</p></div>
            </div>
          </div>

          <div className="lt-book-section-wrap">
            <h3 className="lt-section-title">Book Your Tests</h3>
            <div className="lt-book-opts">
              <div className="lt-book-opt">
                <div className="lt-bo-icon lt-bo-green">📄</div>
                <h4>Upload Prescription</h4>
                <p>Have MeraDoc&apos;s team call with prices</p>
                <button className="lt-get-started">Get Started →</button>
              </div>
              <div className="lt-book-opt">
                <div className="lt-bo-icon lt-bo-blue">📞</div>
                <h4>Call to Book Tests</h4>
                <p>Speak with our team for assistance</p>
                <a href="tel:18003090101" className="lt-get-started">Get Started →</a>
              </div>
              <div className="lt-book-opt">
                <div className="lt-bo-icon lt-bo-purple">❓</div>
                <h4>Not sure which test to take?</h4>
                <p>Consult a MeraDoc doctor now</p>
                <button className="lt-get-started">Get Started →</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Cart View ─────────────────────────────────────────────────────────────────
function CartView({ location, cart, setCart, profile, onCheckout, onBack }) {
  const [date,       setDate]       = useState("");
  const [slots,      setSlots]      = useState([]);
  const [chosenSlot, setChosenSlot] = useState(null);
  const [loadSlots,  setLoadSlots]  = useState(false);
  const [error,      setError]      = useState("");

  const getDisc = (t) => Number(t.offerPrice || t.offer_price || t.discountedPrice || t.discounted_price ||
    t.finalPrice || t.final_price || t.sellingPrice || t.selling_price || t.price || t.mrp || 0);
  const getMrp  = (t) => Number(t.price || t.mrp || t.originalPrice || t.original_price ||
    t.basePrice || t.base_price || t.regularPrice || 0) || getDisc(t);

  const totalMrp  = cart.reduce((s, t) => s + getMrp(t),  0);
  const totalDisc = cart.reduce((s, t) => s + getDisc(t), 0);

  useEffect(() => {
    if (!date || !cart.length) return;
    setLoadSlots(true); setError(""); setSlots([]); setChosenSlot(null);
    DiagnosticService.getPhleboSlots({
      date, lat: location.lat, long: location.long, zipcode: location.pincode,
      ...(location.zoneId ? { zoneId: location.zoneId } : {}),
      patients: [{ name: profile?.name || "Patient", gender: (profile?.gender || "Male").toUpperCase(), age: String(profile?.age || 25), ageType: "YEAR" }],
      testList: cart.map((t) => ({ id: t._id || t.id, type: t.type || "PACKAGE", name: t.name || "" })),
    }).then((data) => {
      // data.data is [{partner, serviceable, slots: [{id, startTime12hr, endTime12hr, ...}]}, ...]
      const rawData = data?.data;
      let list = [];
      if (Array.isArray(rawData)) {
        list = rawData.flatMap((p) => Array.isArray(p.slots) ? p.slots : []);
      } else if (Array.isArray(rawData?.slots)) {
        list = rawData.slots;
      } else if (Array.isArray(data?.slots)) {
        list = data.slots;
      } else if (Array.isArray(data)) {
        list = data;
      }
      setSlots(list);
      if (!list.length) setError("No slots available for this date. Try another.");
    }).catch((err) => setError(err.message)).finally(() => setLoadSlots(false));
  }, [date, cart, location, profile]);

  const slotLabel = (s) => {
    if (!s || typeof s !== "object") return String(s || "");
    if (s.startTime12hr && s.endTime12hr) return `${s.startTime12hr} - ${s.endTime12hr}`;
    return s.collectionSlotTime || s.displayTime || s.time || s.slotTime ||
      s.slot || s.label || s.name || s.startTime || s.timings || s.timing ||
      Object.values(s).find((v) => typeof v === "string" && /\d+[: ]\d+/.test(v)) ||
      Object.values(s).find((v) => typeof v === "string" && v.length > 2) ||
      JSON.stringify(s);
  };
  const slotId = (s) => s.id || s.slot_id || s.slotId || s._id || s.slotNo || s.slotNumber;
  const removeTest = (id) => setCart((p) => p.filter((t) => t._id !== id && t.id !== id));

  return (
    <div className="lt-cart-wrap">
      <div className="lt-cart-header">
        <button className="lt-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2>Lab Tests ({cart.length})</h2>
      </div>

      {/* Cart items */}
      <div className="lt-co-card">
        <h4 className="lt-section-label">🔬 Lab Tests &amp; Packages</h4>
        {cart.map((test) => {
          const id   = test._id || test.id;
          const disc = getDisc(test);
          const mrp  = getMrp(test);
          const pct  = mrp > disc ? Math.round((1 - disc / mrp) * 100) : 0;
          const desc = test.description || test.details || "";
          return (
            <div key={id} className="lt-cart-item">
              <div className="lt-cart-thumb">🔬</div>
              <div className="lt-cart-info">
                <p className="lt-cart-name">{test.name || test.packageName}</p>
                {desc && <p className="lt-cart-desc">{desc.slice(0, 80)}{desc.length > 80 ? "…" : ""}</p>}
                <div className="lt-cart-price-row">
                  {disc < mrp && <span className="lt-mrp">₹{mrp}</span>}
                  {pct > 0 && <span className="lt-badge">{pct}% OFF</span>}
                  <span className="lt-disc">₹{disc}</span>
                </div>
              </div>
              <div className="lt-cart-right">
                <button className="lt-delete-btn" onClick={() => removeTest(id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
                <span className="lt-qty">Qty: 1</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preferred schedule */}
      <div className="lt-co-card">
        <h4 className="lt-section-label">📅 Preferred Schedule</h4>
        <div className="lt-schedule-row">
          <label>Select Date</label>
          <div className="lt-date-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <input type="date" className="lt-date-input" min={tomorrow()} max={maxDate()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="lt-schedule-row">
          <label>Select Time Slot</label>
          {loadSlots ? <p className="lt-hint">Loading slots…</p> : (
            <select className="lt-slot-select" value={chosenSlot ? String(slotId(chosenSlot)) : ""} onChange={(e) => setChosenSlot(slots.find((s) => String(slotId(s)) === e.target.value) || null)} disabled={!date || !slots.length}>
              <option value="">Choose time slot</option>
              {slots.map((s, i) => <option key={i} value={String(slotId(s))}>{slotLabel(s)}</option>)}
            </select>
          )}
        </div>
        {error && !loadSlots && <p className="lt-error">{error}</p>}
      </div>

      <div className="lt-cart-footer">
        <div><p className="lt-cart-footer-label">Total Amount</p><p className="lt-cart-footer-total">₹{totalDisc}</p></div>
        <button className="lt-proceed-btn" disabled={!date || !chosenSlot || !cart.length} onClick={() => onCheckout({ slotId: String(slotId(chosenSlot)), collectionDate: date, collectionSlotTime: slotLabel(chosenSlot) })}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}

// ── Checkout View ─────────────────────────────────────────────────────────────
function CheckoutView({ location, cart, slotInfo, profile, onDone, onBack }) {
  const [coupon,         setCoupon]         = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg,      setCouponMsg]      = useState("");
  const [booking,        setBooking]        = useState(false);
  const [error,          setError]          = useState("");

  const getDisc = (t) => Number(t.offerPrice || t.offer_price || t.discountedPrice || t.discounted_price ||
    t.finalPrice || t.final_price || t.sellingPrice || t.selling_price || t.price || t.mrp || 0);
  const getMrp  = (t) => Number(t.price || t.mrp || t.originalPrice || t.original_price ||
    t.basePrice || t.base_price || t.regularPrice || 0) || getDisc(t);

  const totalMrp  = cart.reduce((s, t) => s + getMrp(t),  0);
  const totalDisc = cart.reduce((s, t) => s + getDisc(t), 0);
  const savings   = totalMrp - totalDisc;
  const orderTotal = Math.max(0, totalDisc - couponDiscount);
  const firstTest = cart[0] || {};

  const applyCoupon = () => {
    setCouponMsg("");
    if (coupon.toUpperCase() === "SAVE100") { setCouponDiscount(100); setCouponMsg("₹100 discount applied!"); }
    else { setCouponMsg("Invalid coupon code."); setCouponDiscount(0); }
  };

  const handleBook = async () => {
    if (!profile.patientId) {
      setError("Your health profile is incomplete. Please complete registration at meradoc-register first.");
      return;
    }
    setBooking(true); setError("");
    try {
      await UserService.generateToken();
      const data = await DiagnosticService.bookLabTest({
        email:              profile.email,
        partner:            firstTest.partner || "thyrocare",
        patientId:          profile.patientId,
        patientName:        profile.name,
        relation:           "self",
        age:                String(profile.age || 25),
        gender:             profile.gender || "Male",
        mobileNumber:       (profile.phone || "").replace(/^\+\d+\s?/, ""),
        emailId:            profile.email,
        slotId:             slotInfo.slotId,
        lat:                location.lat,
        long:               location.long,
        addressLine1:       location.addressLine1,
        addressLine2:       location.addressLine1,
        addressLandmark:    location.addressLine1,
        cityId:             location.cityId  || "",
        city:               location.city    || "",
        stateId:            location.stateId || "",
        state:              location.state   || "",
        pincode:            location.pincode,
        offerId:            firstTest.offerId || firstTest.packageCode || firstTest._id || "",
        productType:        firstTest.productType || "SSKU",
        packageName:        cart.map((t) => t.name || t.packageName || ""),
        packageCode:        cart.map((t) => t.packageCode || t.offerId || t._id || ""),
        collectionDate:     slotInfo.collectionDate,
        collectionSlotTime: slotInfo.collectionSlotTime,
        mrp:                totalMrp,
        discountedPrice:    String(orderTotal),
      });
      const orderId  = data?.data?.orderId || data?.data?._id || data?.orderId || data?._id;
      const isPending = data?.data?.orderStatus === "PAYMENT_PENDING" || data?.data?.paymentStatus === "NA";
      onDone(orderId || "N/A", isPending);
    } catch (err) { setError(err.message || "Booking failed. Please try again."); }
    finally { setBooking(false); }
  };

  return (
    <div className="lt-cart-wrap">
      <div className="lt-cart-header">
        <button className="lt-back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <h2>Checkout</h2>
      </div>

      {!profile.patientId && (
        <div className="lt-error" style={{ margin: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <strong>Health profile not found.</strong>
          <span>You need to complete your MeraDoc registration before booking.</span>
          <a href="/meradoc-register" style={{ color: "#1a4fd4", fontWeight: 600 }}>Complete registration →</a>
        </div>
      )}

      {/* Delivery address */}
      <div className="lt-co-card">
        <div className="lt-co-card-head">
          <h4 className="lt-section-label">📍 Delivery Address</h4>
        </div>
        <p className="lt-co-address">{location.addressLine1}</p>
        {(location.city || location.state) && <p className="lt-co-address-sub">{location.city}{location.state ? `, ${location.state}` : ""} — {location.pincode}</p>}
        <p className="lt-co-schedule">📅 {fmtDate(slotInfo.collectionDate)} · {slotInfo.collectionSlotTime}</p>
      </div>

      {/* Coupon */}
      <div className="lt-co-card">
        <h4 className="lt-section-label">🏷️ Apply Coupon</h4>
        <div className="lt-coupon-row">
          <input type="text" className="lt-coupon-input" placeholder="Enter coupon code" value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponMsg(""); setCouponDiscount(0); }} />
          <button className="lt-coupon-apply" onClick={applyCoupon}>Apply</button>
        </div>
        {couponMsg && <p className={`lt-coupon-msg ${couponDiscount > 0 ? "lt-coupon-ok" : "lt-coupon-err"}`}>{couponMsg}</p>}
        <p className="lt-hint">Try: SAVE100 for ₹100 off</p>
      </div>

      {/* Bill summary */}
      <div className="lt-co-card">
        <h4 className="lt-section-label">Bill Summary</h4>
        <div className="lt-bill-row"><span>Cart value</span><span>₹{totalMrp}</span></div>
        <div className="lt-bill-row"><span>Saving&apos;s on MRP</span><span className="lt-saving">-₹{savings}</span></div>
        <div className="lt-bill-row"><span>Coupon Discount</span><span className={couponDiscount > 0 ? "lt-saving" : ""}>-₹{couponDiscount}</span></div>
        <div className="lt-bill-row"><span>Home Collection Charge</span><span>₹0</span></div>
        <div className="lt-bill-divider" />
        <div className="lt-bill-row lt-savings-row"><span>Total Savings</span><span>₹{savings + couponDiscount}</span></div>
        <div className="lt-bill-row lt-order-total-row"><span>Order Total</span><span>₹{orderTotal}</span></div>
      </div>

      {error && <p className="lt-error" style={{ padding: "0 1rem 1rem" }}>{error}</p>}

      <div className="lt-cart-footer">
        <div><p className="lt-cart-footer-label">Total Amount</p><p className="lt-cart-footer-total">₹{orderTotal}</p></div>
        <button className="lt-proceed-btn" onClick={handleBook} disabled={booking || !profile.patientId}>
          {booking ? "Booking…" : "Proceed to Checkout"}
        </button>
      </div>
    </div>
  );
}

// ── Success View ──────────────────────────────────────────────────────────────
function SuccessView({ orderId: orderData }) {
  const router  = useRouter();
  const id      = orderData?.id      ?? orderData;
  const pending = orderData?.pending ?? false;
  return (
    <div className="lt-success-wrap">
      <div className="lt-success-card animate-fade-in">
        <div className="lt-success-icon">{pending ? "🕐" : "✅"}</div>
        <h2>{pending ? "Order Placed!" : "Booking Confirmed!"}</h2>
        {pending ? (
          <p>Your order is placed and <strong>payment is pending</strong>. Complete payment via the MeraDoc app or our team will contact you.</p>
        ) : (
          <p>A phlebotomist will visit you for doorstep sample collection.</p>
        )}
        <div className="lt-order-id-box">
          <span>Order ID</span>
          <strong>{id}</strong>
        </div>
        <p className="lt-hint" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          Digital reports will be available within 24 hours of sample collection.
        </p>
        <button className="lt-btn-submit" onClick={() => router.push("/consultancy")}>
          Back to Services
        </button>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function LabTestsPage() {
  const router = useRouter();

  const [cart,     setCart]     = useState(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("ltCart") || "[]"); } catch { return []; }
  });
  const [location, setLocation] = useState(null);
  const [checking, setChecking] = useState(true); // verifying serviceability on entry
  const [profile,  setProfile]  = useState(null);

  // On mount: load saved address, re-verify serviceability, then show main view
  useEffect(() => {
    const getSaved = () => {
      try {
        const loc = JSON.parse(localStorage.getItem("ltLocation") || "null");
        if (loc) return loc;
        const email = localStorage.getItem("userEmail") || "";
        if (email) {
          const backup = JSON.parse(localStorage.getItem(`ltLocation_${email}`) || "null");
          if (backup) {
            localStorage.setItem("ltLocation",     JSON.stringify(backup));
            localStorage.setItem("ltDeliveryCity", backup.city || "");
            return backup;
          }
        }
        return null;
      } catch { return null; }
    };

    const saved = getSaved();
    if (!saved) { router.replace("/consultancy/lab-tests/address"); return; }

    // Re-verify serviceability so partners/IDs are always fresh
    DiagnosticService.checkServiceability({ zipcode: saved.pincode, lat: saved.lat, long: saved.long })
      .then((data) => {
        const partners    = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : []);
        const serviceable = partners.length > 0
          ? partners.some((p) => p.serviceable !== false)
          : (data?.isServiceable ?? true);

        if (!serviceable) {
          localStorage.removeItem("ltLocation");
          router.replace("/consultancy/lab-tests/address");
          return;
        }

        const anyWithIds = partners.find((p) => p.zoneId) || partners[0] || {};
        const updated = {
          ...saved,
          partners: partners.map((p) => ({
            partner: p.partner || "",
            cityId:  p.cityId  != null ? String(p.cityId)  : "",
            stateId: p.stateId != null ? String(p.stateId) : "",
            zoneId:  p.zoneId  != null ? String(p.zoneId)  : "",
          })),
          cityId:  anyWithIds.cityId  != null ? String(anyWithIds.cityId)  : saved.city,
          stateId: anyWithIds.stateId != null ? String(anyWithIds.stateId) : saved.state,
          zoneId:  anyWithIds.zoneId  != null ? String(anyWithIds.zoneId)  : "",
        };

        localStorage.setItem("ltLocation",     JSON.stringify(updated));
        localStorage.setItem("ltDeliveryCity", updated.city || "");
        const email = localStorage.getItem("userEmail") || "";
        if (email) localStorage.setItem(`ltLocation_${email}`, JSON.stringify(updated));
        window.dispatchEvent(new Event("lt-nav-update"));

        setLocation(updated);
        setChecking(false);
      })
      .catch(() => {
        // On network error fall back to cached data rather than blocking the user
        setLocation(saved);
        setChecking(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Profile loading
  useEffect(() => {
    const email     = localStorage.getItem("userEmail")  || "";
    const name      = localStorage.getItem("userName")   || "";
    const phone     = localStorage.getItem("userPhone")  || "";
    const gender    = localStorage.getItem("userGender") || "";
    const cachedPid = email ? localStorage.getItem(`meradocPatientId_${email}`) : null;
    setProfile({ email, name, phone, gender, patientId: cachedPid, age: null });

    if (email) {
      fetch(`/api/users?email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then(({ user }) => {
          if (user) setProfile((p) => ({ ...p, name: user.name || p.name, gender: user.gender || p.gender || "", age: ageFromDob(user.dob) }));
        })
        .catch(() => {});

      if (!cachedPid) {
        fetch(`/api/meradoc/patient?email=${encodeURIComponent(email)}`)
          .then((r) => r.json())
          .then(({ patientId }) => {
            if (patientId) {
              localStorage.setItem(`meradocPatientId_${email}`, patientId);
              setProfile((p) => ({ ...p, patientId }));
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  // Persist cart
  useEffect(() => {
    localStorage.setItem("ltCart", JSON.stringify(cart));
    window.dispatchEvent(new Event("lt-nav-update"));
  }, [cart]);

  if (checking) return (
    <div className="lt-address-wrap">
      <div className="lt-address-card" style={{ textAlign: "center" }}>
        <div className="apt-spinner-sm" style={{ margin: "1rem auto" }} />
        <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Checking service availability…</p>
      </div>
    </div>
  );

  return <MainView location={location} cart={cart} onAddToCart={(t) => setCart((p) => [...p, t])} />;
}
