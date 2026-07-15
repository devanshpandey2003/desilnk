"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatedNumber } from "@/components/motion";
import { DiagnosticService } from "../../../services/diagnostic.service";
import { UserService } from "../../../services/user.service";
import "../lab-tests/lab-tests.css";


const fmtRupees2 = (n) => `₹${n.toFixed(2)}`;
const fmtRupeesInt = (n) => `₹${Math.round(n)}`;
const fmtCount = (n) => `${Math.round(n)}`;

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
function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }
function maxDate()   { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; }
function fmtDate(str) {
  if (!str) return "";
  return new Date(str + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
const getDisc = (t) => Number(t.offerPrice || t.offer_price || t.discountedPrice || t.discounted_price || t.price || t.mrp || 0);
const getMrp  = (t) => Number(t.price || t.mrp || t.originalPrice || 0) || getDisc(t);
const slotLabel = (s) => {
  if (!s || typeof s !== "object") return String(s || "");
  if (s.startTime12hr && s.endTime12hr) return `${s.startTime12hr} - ${s.endTime12hr}`;
  return s.collectionSlotTime || s.displayTime || s.time || s.slotTime || s.slot || s.label || s.name || s.startTime || JSON.stringify(s);
};
const slotId = (s) => s.slotId || s.slot_id || s._id || s.slotNo || s.slotNumber || s.id;

// ── Medicine Order View ───────────────────────────────────────────────────────
function MedOrderView({ medCart, location, onDone, onBack }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  const hasRx    = medCart.some(i => i.product?.additonalInfo?.isRxRequired);
  const medTotal = medCart.reduce((s, i) => s + (parseFloat(i.product?.pricingInfo?.discountedMrp || i.product?.pricingInfo?.mrp || 0) * i.qty), 0);

  useEffect(() => {
    try { setPrescriptions(JSON.parse(localStorage.getItem("medPrescriptions") || "[]")); } catch {}
  }, []);

  const canOrder = location && (!hasRx || prescriptions.length > 0);

  const handleOrder = async () => {
    setLoading(true); setError("");
    try {
      const email = localStorage.getItem("userEmail") || "";

      const addrRes = await fetch(`/api/meradoc/address?email=${encodeURIComponent(email)}`);
      const { addressId } = await addrRes.json();
      if (!addressId) { setError("Delivery address not synced. Please re-save your address."); return; }

      const token     = localStorage.getItem("accessToken") || "";
      const patientId = localStorage.getItem(`meradocPatientId_${email}`) || "";
      const res   = await fetch("/api/medicine/order", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
          "x-user-email":  email,
          "x-patient-id":  patientId,
        },
        body: JSON.stringify({
          addressId,
          items: medCart.map(i => ({
            productId:    i.product.productId,
            name:         i.product.name,
            quantity:     i.qty,
            isPrescribed: i.product.additonalInfo?.isRxRequired || false,
          })),
          ...(prescriptions.length ? { prescriptions: prescriptions.map(p => ({
            fileName: p.fileName,
            filePath: `prescriptions/${p.fileName}`,
          })) } : {}),
        }),
      });
      const json = await res.json();

      if (!json.error && (json.status === 200 || json.data?._id || json.data?.orderId)) {
        const orderId = json.data?.orderId || json.data?._id || "N/A";

        // Persist order so it's visible in Profile → Medicine Orders
        if (orderId && orderId !== "N/A") {
          try {
            const orderRecord = {
              orderId,
              placedAt: Date.now(),
              totalPrice: json.data?.totalPrice || json.data?.price || null,
              deliveryCharges: json.data?.deliveryCharges || null,
              orderStatus: json.data?.orderStatus || "PENDING",
              items: (json.data?.items || medCart.map((i) => ({
                name: i.product?.name || "",
                quantity: i.qty,
                mrp: i.product?.pricingInfo?.mrp || 0,
                discountedMrp: i.product?.pricingInfo?.discountedMrp || 0,
              }))),
            };
            const prev = JSON.parse(localStorage.getItem(`medOrders_${email}`) || "[]");
            if (!prev.some((o) => o.orderId === orderId)) {
              localStorage.setItem(`medOrders_${email}`, JSON.stringify([orderRecord, ...prev].slice(0, 20)));
            }
          } catch (_) {}
        }

        localStorage.removeItem("medCart");
        localStorage.removeItem("medPrescriptions");
        window.dispatchEvent(new Event("lt-nav-update"));
        onDone(orderId);
      } else {
        // Honest, source-attributed failure — tell the user who to blame
        const label = {
          desilink: "Desilink server error",
          meradoc:  "MeraDoc server error",
          external: "Pharmacy partner (PharmEasy) error",
        }[json.source] || "Order failed";
        setError(`${label}: ${json.message || "Please try again."}`);
      }
    } catch {
      // fetch itself failed → our side couldn't even send the request
      setError("Desilink server error: could not reach the server. Please try again.");
    }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="lt-co-card">
        <button className="lt-back-btn" style={{ marginBottom: "0.75rem" }} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <h4 className="lt-section-label">📍 Delivery Address</h4>
        {location ? (
          <>
            <p className="lt-co-address">{location.addressLine1}</p>
            {(location.city || location.state) && <p className="lt-co-address-sub">{location.city}{location.state ? `, ${location.state}` : ""} — {location.pincode}</p>}
          </>
        ) : (
          <p className="lt-hint"><Link href="/consultancy/lab-tests/address?for=medicines" style={{ color: "#1a4fd4" }}>Set delivery address →</Link></p>
        )}
      </div>

      {hasRx && (
        <div className="lt-co-card">
          <h4 className="lt-section-label">📋 Prescription</h4>
          {prescriptions.length > 0 ? (
            <>
              {prescriptions.map(p => (
                <div key={p.fileName} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span>{p.fileType === "application/pdf" ? "📄" : "🖼️"}</span>
                  <span style={{ fontSize: "0.85rem", color: "#1a1f36" }}>{p.fileName}</span>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>({(p.size / 1024).toFixed(1)} KB)</span>
                </div>
              ))}
              <Link href="/consultancy/medicines/prescription" style={{ fontSize: "0.8rem", color: "#1a4fd4" }}>Change prescription</Link>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <p className="lt-hint" style={{ color: "#92400e" }}>One or more items require a prescription.</p>
              <Link href="/consultancy/medicines/prescription" style={{ color: "#1a4fd4", fontWeight: 600, fontSize: "0.88rem" }}>📋 Upload Prescription →</Link>
            </div>
          )}
        </div>
      )}

      <div className="lt-co-card">
        <h4 className="lt-section-label">Bill Summary</h4>
        {medCart.map(({ product, qty }) => (
          <div key={product.productId} className="lt-bill-row">
            <span>{product.name.length > 30 ? product.name.slice(0, 30) + "…" : product.name} × {qty}</span>
            <span>₹{(parseFloat(product.pricingInfo?.discountedMrp || product.pricingInfo?.mrp || 0) * qty).toFixed(2)}</span>
          </div>
        ))}
        <div className="lt-bill-divider" />
        <div className="lt-bill-row lt-order-total-row"><span>Order Total</span><span><AnimatedNumber value={medTotal} format={fmtRupees2} /></span></div>
      </div>

      {error && <p className="lt-error" style={{ padding: "0 0 0.5rem" }}>{error}</p>}

      <div className="lt-cart-footer">
        <div><p className="lt-cart-footer-label">Total Amount</p><p className="lt-cart-footer-total"><AnimatedNumber value={medTotal} format={fmtRupees2} /></p></div>
        <button className="lt-proceed-btn" disabled={!canOrder || loading} onClick={handleOrder}>
          {loading ? "Placing Order…" : "Place Order →"}
        </button>
      </div>
    </>
  );
}

// ── Medicine Cart Tab (needs hooks for availability) ──────────────────────────
function MedCartTab({ medCart, setMedCart, location, onMedProceed }) {
  const [avail,        setAvail]        = useState({}); // { [ucode]: true | false }
  const [availLoading, setAvailLoading] = useState(false);
  const [availChecked, setAvailChecked] = useState(false);

  // Run availability check whenever cart or pincode changes
  useEffect(() => {
    if (!location?.pincode || medCart.length === 0) { setAvail({}); setAvailChecked(false); return; }
    const ucodes = medCart.map(i => i.product.ucode).filter(Boolean);
    if (ucodes.length === 0) { setAvailChecked(true); return; }

    setAvailLoading(true);
    fetch("/api/medicine/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pincode: location.pincode, ucodes }),
    })
      .then(r => r.json())
      .then(j => { setAvail(j.availability || {}); })
      .catch(() => {})
      .finally(() => { setAvailLoading(false); setAvailChecked(true); });
  }, [location?.pincode, medCart.length]);

  const updateMedQty = (productId, delta) => {
    const updated = medCart.map(i => i.product.productId === productId ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0);
    setMedCart(updated);
    localStorage.setItem("medCart", JSON.stringify(updated));
    window.dispatchEvent(new Event("lt-nav-update"));
  };
  const removeMed = (productId) => {
    const updated = medCart.filter(i => i.product.productId !== productId);
    setMedCart(updated);
    localStorage.setItem("medCart", JSON.stringify(updated));
    window.dispatchEvent(new Event("lt-nav-update"));
  };
  const removeUnavailable = () => {
    const updated = medCart.filter(i => !(i.product.ucode && avail[i.product.ucode] === false));
    setMedCart(updated);
    localStorage.setItem("medCart", JSON.stringify(updated));
    window.dispatchEvent(new Event("lt-nav-update"));
  };

  const medTotal      = medCart.reduce((s, i) => s + (parseFloat(i.product?.pricingInfo?.discountedMrp || i.product?.pricingInfo?.mrp || 0) * i.qty), 0);
  // Block proceed if any item failed the availability check (only after check completes)
  const hasUnavailable = availChecked && medCart.some(i => i.product.ucode && avail[i.product.ucode] === false);

  return (
    <>
      <div className="lt-co-card">
        <h4 className="lt-section-label">
          💊 Medicines
          {availLoading && <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 400, marginLeft: "0.5rem" }}>Checking availability…</span>}
        </h4>
        {medCart.length === 0 ? (
          <p className="lt-hint">Your medicines cart is empty. <Link href="/consultancy/medicines" style={{ color: "#1a4fd4" }}>Browse medicines →</Link></p>
        ) : medCart.map(({ product, qty }) => {
          const price       = parseFloat(product.pricingInfo?.discountedMrp || product.pricingInfo?.mrp || 0);
          const mrp         = parseFloat(product.pricingInfo?.mrp || 0);
          const pct         = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
          const img         = product.productImage?.find(i => i.face === "front")?.url || product.productImage?.[0]?.url;
          const isAvailable = !availChecked || !product.ucode || avail[product.ucode] !== false;
          return (
            <div key={product.productId} className="lt-cart-item" style={{ alignItems: "flex-start", opacity: isAvailable ? 1 : 0.65 }}>
              {img
                ? <img src={img} alt={product.name} style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: "#f3f4f6", flexShrink: 0 }} />
                : <div className="lt-cart-thumb">💊</div>
              }
              <div className="lt-cart-info" style={{ flex: 1 }}>
                <p className="lt-cart-name">{product.name}</p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                  {product.additonalInfo?.isRxRequired && <span className="lt-badge" style={{ background: "#fef3c7", color: "#92400e" }}>Rx Required</span>}
                  {availChecked && product.ucode && (
                    isAvailable
                      ? <span className="lt-badge" style={{ background: "#dcfce7", color: "#166534" }}>✓ Available</span>
                      : <span className="lt-badge" style={{ background: "#fee2e2", color: "#991b1b" }}>✕ Not available at {location?.pincode}</span>
                  )}
                </div>
                <div className="lt-cart-price-row">
                  {pct > 0 && <span className="lt-mrp">₹{mrp}</span>}
                  {pct > 0 && <span className="lt-badge">{pct}% OFF</span>}
                  <span className="lt-disc">₹{(price * qty).toFixed(2)}</span>
                </div>
                {isAvailable && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                    <button onClick={() => updateMedQty(product.productId, -1)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "#1a4fd4", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>−</button>
                    <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{qty}</span>
                    <button onClick={() => updateMedQty(product.productId, +1)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "#1a4fd4", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}>+</button>
                  </div>
                )}
                {!isAvailable && (
                  <button onClick={() => removeMed(product.productId)} style={{ fontSize: "0.78rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "0.3rem" }}>
                    Remove from cart
                  </button>
                )}
              </div>
              {isAvailable && (
                <button className="lt-delete-btn" onClick={() => removeMed(product.productId)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              )}
            </div>
          );
        })}
        {hasUnavailable && (
          <p style={{ fontSize: "0.8rem", color: "#dc2626", marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "#fee2e2", borderRadius: 8 }}>
            Some items are not deliverable to your pincode. Please remove them to continue.
          </p>
        )}
      </div>

      <div className="lt-co-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4 className="lt-section-label">📍 Delivery Address</h4>
          <Link href="/consultancy/lab-tests/address?for=medicines" style={{ fontSize: "0.82rem", color: "#1a4fd4" }}>Change</Link>
        </div>
        {location ? (
          <>
            <p className="lt-co-address">{location.addressLine1}</p>
            {(location.city || location.state) && <p className="lt-co-address-sub">{location.city}{location.state ? `, ${location.state}` : ""} — {location.pincode}</p>}
          </>
        ) : (
          <p className="lt-hint"><Link href="/consultancy/lab-tests/address?for=medicines" style={{ color: "#1a4fd4" }}>Set your delivery address →</Link></p>
        )}
      </div>

      {medCart.length > 0 && (
        <div className="lt-co-card">
          <h4 className="lt-section-label">Bill Summary</h4>
          <div className="lt-bill-row"><span>Items (<AnimatedNumber value={medCart.reduce((s, i) => s + i.qty, 0)} format={fmtCount} />)</span><span><AnimatedNumber value={medTotal} format={fmtRupees2} /></span></div>
          <div className="lt-bill-row"><span>Delivery</span><span>₹0</span></div>
          <div className="lt-bill-divider" />
          <div className="lt-bill-row lt-order-total-row"><span>Order Total</span><span><AnimatedNumber value={medTotal} format={fmtRupees2} /></span></div>
        </div>
      )}

      <div className="lt-cart-footer">
        <div><p className="lt-cart-footer-label">Total Amount</p><p className="lt-cart-footer-total"><AnimatedNumber value={medTotal} format={fmtRupees2} /></p></div>
        {!location ? (
          <Link href="/consultancy/lab-tests/address?for=medicines" className="lt-proceed-btn" style={{ textDecoration: "none", textAlign: "center" }}>
            Add Delivery Address
          </Link>
        ) : (
          <button
            className="lt-proceed-btn"
            disabled={medCart.length === 0 || availLoading}
            onClick={hasUnavailable ? removeUnavailable : onMedProceed}
          >
            {availLoading ? "Checking…" : hasUnavailable ? "Remove unavailable items" : "Proceed to Order"}
          </button>
        )}
      </div>
    </>
  );
}

// ── Cart Items View ───────────────────────────────────────────────────────────
function CartView({ tab, labCart, setLabCart, medCart, setMedCart, location, onProceed, onMedProceed }) { // medCart/setMedCart/onMedProceed passed through to MedCartTab
  const removeItem = (id) => {
    const updated = labCart.filter((t) => (t._id || t.id) !== id);
    setLabCart(updated);
    localStorage.setItem("ltCart", JSON.stringify(updated));
    window.dispatchEvent(new Event("lt-nav-update"));
  };

  const totalMrp  = labCart.reduce((s, t) => s + getMrp(t),  0);
  const totalDisc = labCart.reduce((s, t) => s + getDisc(t), 0);
  const savings   = totalMrp - totalDisc;

  return (
    <>
      {tab === "lab" && (
        <>
          <div className="lt-co-card">
            <h4 className="lt-section-label">🔬 Lab Tests &amp; Packages</h4>
            {labCart.length === 0 ? (
              <p className="lt-hint">Your lab cart is empty. <Link href="/consultancy/lab-tests" style={{ color: "#1a4fd4" }}>Add some tests to continue.</Link></p>
            ) : labCart.map((test) => {
              const id   = test._id || test.id;
              const disc = getDisc(test);
              const mrp  = getMrp(test);
              const pct  = mrp > disc ? Math.round((1 - disc / mrp) * 100) : 0;
              return (
                <div key={id} className="lt-cart-item">
                  <div className="lt-cart-thumb">🔬</div>
                  <div className="lt-cart-info">
                    <p className="lt-cart-name">{test.name || test.packageName}</p>
                    {test.partner && <span className="lt-partner-tag">{test.partner}</span>}
                    <div className="lt-cart-price-row">
                      {disc < mrp && <span className="lt-mrp">₹{mrp}</span>}
                      {pct > 0 && <span className="lt-badge">{pct}% OFF</span>}
                      <span className="lt-disc">₹{disc}</span>
                    </div>
                  </div>
                  <button className="lt-delete-btn" onClick={() => removeItem(id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="lt-co-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 className="lt-section-label">📍 Delivery Address</h4>
              <Link href="/consultancy/lab-tests" style={{ fontSize: "0.82rem", color: "#1a4fd4" }}>Change</Link>
            </div>
            {location ? (
              <>
                <p className="lt-co-address">{location.addressLine1}</p>
                {(location.city || location.state) && (
                  <p className="lt-co-address-sub">{location.city}{location.state ? `, ${location.state}` : ""} — {location.pincode}</p>
                )}
              </>
            ) : (
              <p className="lt-hint"><Link href="/consultancy/lab-tests" style={{ color: "#1a4fd4" }}>Set your delivery address</Link></p>
            )}
          </div>

          {labCart.length > 0 && (
            <div className="lt-co-card">
              <h4 className="lt-section-label">Bill Summary</h4>
              <div className="lt-bill-row"><span>Cart value</span><span><AnimatedNumber value={totalMrp} format={fmtRupeesInt} /></span></div>
              <div className="lt-bill-row"><span>Saving&apos;s on MRP</span><span className="lt-saving">-<AnimatedNumber value={savings} format={fmtRupeesInt} /></span></div>
              <div className="lt-bill-row"><span>Home Collection Charge</span><span>₹0</span></div>
              <div className="lt-bill-divider" />
              <div className="lt-bill-row lt-order-total-row"><span>Order Total</span><span><AnimatedNumber value={totalDisc} format={fmtRupeesInt} /></span></div>
            </div>
          )}
        </>
      )}

      {tab === "medicines" && (
        <MedCartTab
          medCart={medCart}
          setMedCart={setMedCart}
          location={location}
          onMedProceed={onMedProceed}
        />
      )}

      {tab === "lab" && (
        <div className="lt-cart-footer">
          <div>
            <p className="lt-cart-footer-label">Total Amount</p>
            <p className="lt-cart-footer-total"><AnimatedNumber value={totalDisc} format={fmtRupeesInt} /></p>
          </div>
          <button className="lt-proceed-btn" disabled={labCart.length === 0 || !location} onClick={onProceed}>
            Proceed to Book
          </button>
        </div>
      )}
    </>
  );
}

// ── Slot Selection View ───────────────────────────────────────────────────────
function SlotView({ labCart, location, profile, onConfirm, onBack }) {
  const [date,            setDate]            = useState("");
  const [slots,           setSlots]           = useState([]);
  const [chosenSlot,      setChosenSlot]      = useState(null);
  const [loadSlots,       setLoadSlots]       = useState(false);
  const [error,           setError]           = useState("");
  const [notServiceable,  setNotServiceable]  = useState(false);

  useEffect(() => {
    if (!date || !labCart.length) return;
    setLoadSlots(true); setError(""); setSlots([]); setChosenSlot(null); setNotServiceable(false);
    const cartPartner = labCart[0]?.partner || "";
    // Use partner-specific zoneId when available, fall back to top-level
    const effectiveZoneId = location.zoneId
      || (location.partners || []).find((p) => p.zoneId)?.zoneId
      || "";
    DiagnosticService.getPhleboSlots({
      date, lat: location.lat, long: location.long, zipcode: location.pincode,
      ...(effectiveZoneId ? { zoneId: effectiveZoneId } : {}),
      patients: [{ name: profile?.name || "Patient", gender: (profile?.gender || "Male").toUpperCase(), age: String(profile?.age || 25), ageType: "YEAR" }],
      testList: labCart.map((t) => ({ id: t.id || t._id || t.packageCode || t.offerId || "", type: "PACKAGE", name: t.name || "" })),
    }).then((data) => {
      const rawData = data?.data;
      let list = [];
      if (Array.isArray(rawData)) {
        // Only look at the partner matching the cart items — prevents slotId mismatch at booking
        const partnerRow = cartPartner ? rawData.find((p) => p.partner === cartPartner) : null;
        const targetRows = partnerRow ? [partnerRow] : rawData;
        const allNotServiceable = targetRows.length > 0 && targetRows.every((p) => p.serviceable === false);
        if (allNotServiceable) { setNotServiceable(true); return; }
        list = targetRows.flatMap((p) => Array.isArray(p.slots) ? p.slots : []);
      } else if (Array.isArray(rawData?.slots)) {
        list = rawData.slots;
      } else if (Array.isArray(data?.slots)) {
        list = data.slots;
      }
      setSlots(list);
      if (!list.length) setError(`No slots available for ${cartPartner || "this location"} on this date. Try another date.`);
    }).catch((err) => setError(err.message)).finally(() => setLoadSlots(false));
  }, [date, labCart, location, profile]);

  const totalDisc = labCart.reduce((s, t) => s + getDisc(t), 0);

  return (
    <>
      <div className="lt-co-card">
        <button className="lt-back-btn" style={{ marginBottom: "0.75rem" }} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <h4 className="lt-section-label">📅 Select Collection Date &amp; Slot</h4>
        <div className="lt-schedule-row">
          <label>Date</label>
          <div className="lt-date-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <input type="date" className="lt-date-input" min={tomorrow()} max={maxDate()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="lt-schedule-row">
          <label>Time Slot</label>
          {loadSlots ? <p className="lt-hint">Loading slots…</p> : (
            <select className="lt-slot-select" value={chosenSlot ? String(slotId(chosenSlot)) : ""} onChange={(e) => setChosenSlot(slots.find((s) => String(slotId(s)) === e.target.value) || null)} disabled={!date || !slots.length}>
              <option value="">Choose time slot</option>
              {slots.map((s, i) => <option key={i} value={String(slotId(s))}>{slotLabel(s)}</option>)}
            </select>
          )}
        </div>
        {notServiceable && !loadSlots && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", padding: "0.9rem 1rem", marginTop: "0.5rem" }}>
            <p style={{ fontWeight: 600, color: "#92400e", margin: "0 0 0.3rem", fontSize: "0.9rem" }}>
              📍 Lab tests not available at your location
            </p>
            <p style={{ color: "#78350f", fontSize: "0.82rem", margin: "0 0 0.6rem" }}>
              Home collection is not currently available at <strong>{location.city || "your selected address"}</strong>. Please change your delivery address to a serviceable city.
            </p>
            <Link href="/consultancy/lab-tests" style={{ fontSize: "0.82rem", color: "#1a4fd4", fontWeight: 600 }}>
              Change Address →
            </Link>
          </div>
        )}
        {error && !loadSlots && !notServiceable && <p className="lt-error">{error}</p>}
      </div>

      <div className="lt-cart-footer">
        <div><p className="lt-cart-footer-label">Total Amount</p><p className="lt-cart-footer-total"><AnimatedNumber value={totalDisc} format={fmtRupeesInt} /></p></div>
        <button className="lt-proceed-btn" disabled={!date || !chosenSlot} onClick={() => onConfirm({ slotId: String(slotId(chosenSlot)), collectionDate: date, collectionSlotTime: slotLabel(chosenSlot) })}>
          Proceed to Checkout
        </button>
      </div>
    </>
  );
}

// ── Checkout View ─────────────────────────────────────────────────────────────
function CheckoutView({ labCart, location, slotInfo, profile, onDone, onBack }) {
  const [coupon,         setCoupon]         = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg,      setCouponMsg]      = useState("");
  const [booking,        setBooking]        = useState(false);
  const [error,          setError]          = useState("");

  const totalMrp   = labCart.reduce((s, t) => s + getMrp(t),  0);
  const totalDisc  = labCart.reduce((s, t) => s + getDisc(t), 0);
  const savings    = totalMrp - totalDisc;
  const orderTotal = Math.max(0, totalDisc - couponDiscount);
  const firstTest  = labCart[0] || {};

  const applyCoupon = () => {
    setCouponMsg("");
    if (coupon.toUpperCase() === "SAVE100") { setCouponDiscount(100); setCouponMsg("₹100 discount applied!"); }
    else { setCouponMsg("Invalid coupon code."); setCouponDiscount(0); }
  };

  const handleBook = async () => {
    if (!profile?.patientId) { setError("Health profile not found. Please complete registration first."); return; }
    setBooking(true); setError("");
    try {
      await UserService.generateToken();

      // Match partner-specific cityId/stateId/zoneId from serviceability response
      const partnerName = firstTest.partner || "thyrocare";
      const isThy = partnerName === "thyrocare";
      const partnerData = (location.partners || []).find((p) => p.partner === partnerName)
        || (location.partners || [])[0]
        || {};

      // Only send numeric IDs — never send state/city names as IDs
      // Only use the partner-specific value; never fall back to another partner's cityId/stateId
      // (e.g. redcliffe has no cityId/stateId — sending healthians values causes 400)
      const numId = (v) => (v != null && /^\d+$/.test(String(v).trim())) ? String(v).trim() : "";
      const locationIds = isThy ? {} : {
        ...(numId(partnerData.cityId)  ? { cityId:  numId(partnerData.cityId)  } : {}),
        ...(numId(partnerData.stateId) ? { stateId: numId(partnerData.stateId) } : {}),
        ...(numId(partnerData.zoneId || location.zoneId) ? { zoneId: numId(partnerData.zoneId || location.zoneId) } : {}),
      };

      const data = await DiagnosticService.bookLabTest({
        email:              profile.email,
        partner:            partnerName,
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
        ...locationIds,
        city:               location.city  || "",
        state:              location.state || "",
        pincode:            location.pincode,
        offerId:            firstTest.offerId || firstTest.packageCode || firstTest.id || firstTest._id || "",
        productType:        firstTest.productType || "PACKAGE",
        packageName:        labCart.map((t) => t.name || t.packageName || ""),
        packageCode:        labCart.map((t) => t.packageCode || t.offerId || t.id || t._id || ""),
        collectionDate:     slotInfo.collectionDate,
        collectionSlotTime: slotInfo.collectionSlotTime,
        mrp:                totalMrp,
        discountedPrice:    String(orderTotal),
      });
      const orderId  = data?.data?.orderId || data?.data?._id || data?.orderId || data?._id;
      const isPending = data?.data?.orderStatus === "PAYMENT_PENDING" || data?.data?.paymentStatus === "NA";
      if (orderId && orderId !== "N/A") {
        localStorage.setItem("labTestOrderId", orderId);
        const userEmail = profile.email || localStorage.getItem("userEmail") || "";
        if (userEmail) {
          const key = `ltOrders_${userEmail}`;
          try {
            const prev = JSON.parse(localStorage.getItem(key) || "[]");
            if (!prev.includes(orderId)) localStorage.setItem(key, JSON.stringify([orderId, ...prev]));
          } catch {}
        }
      }
      // Clear cart after successful booking
      localStorage.setItem("ltCart", JSON.stringify([]));
      window.dispatchEvent(new Event("lt-nav-update"));
      onDone(orderId || "N/A", isPending);
    } catch (err) {
      // Redcliffe webhook delay: booking goes through on their end but MeraDoc
      // returns 400 for 2-3 min until the webhook confirms. Treat as processing.
      if (err.message === "Redcliffe booking failed") {
        // Save pending booking to localStorage so profile can show it while waiting
        const userEmail = profile.email || localStorage.getItem("userEmail") || "";
        const pendingKey = `ltPendingOrders_${userEmail}`;
        const pendingId  = `pending_${Date.now()}`;
        const pendingEntry = {
          order_id: pendingId,
          status:   "PROCESSING",
          pending:  true,
          bookedAt: Date.now(),
          raw_data: {
            data: {
              packageName:          labCart.map((t) => t.name || ""),
              packageCode:          labCart.map((t) => t.id || t.packageCode || ""),
              sampleCollectionDate: slotInfo.collectionDate,
              sampleCollectionTime: slotInfo.collectionSlotTime,
              partner:              firstTest.partner || "",
              orderStatus:          "PROCESSING",
            }
          }
        };
        try {
          const prev = JSON.parse(localStorage.getItem(pendingKey) || "[]");
          localStorage.setItem(pendingKey, JSON.stringify([pendingEntry, ...prev]));
        } catch {}
        localStorage.setItem("ltCart", JSON.stringify([]));
        window.dispatchEvent(new Event("lt-nav-update"));
        onDone("PROCESSING", true);
      } else {
        setError(err.message || "Booking failed. Please try again.");
      }
    }
    finally { setBooking(false); }
  };

  return (
    <>
      <div className="lt-co-card">
        <button className="lt-back-btn" style={{ marginBottom: "0.75rem" }} onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <h4 className="lt-section-label">📍 Delivery Address</h4>
        <p className="lt-co-address">{location.addressLine1}</p>
        {(location.city || location.state) && <p className="lt-co-address-sub">{location.city}{location.state ? `, ${location.state}` : ""} — {location.pincode}</p>}
        <p className="lt-co-schedule">📅 {fmtDate(slotInfo.collectionDate)} · {slotInfo.collectionSlotTime}</p>
      </div>

      {!profile?.patientId && (
        <div className="lt-error" style={{ margin: "0 0 1rem", padding: "0.75rem 1rem", borderRadius: "8px" }}>
          <strong>Health profile not found.</strong>{" "}
          <a href="/meradoc-register" style={{ color: "#1a4fd4", fontWeight: 600 }}>Complete registration →</a>
        </div>
      )}

      <div className="lt-co-card">
        <h4 className="lt-section-label">🏷️ Apply Coupon</h4>
        <div className="lt-coupon-row">
          <input type="text" className="lt-coupon-input" placeholder="Enter coupon code" value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponMsg(""); setCouponDiscount(0); }} />
          <button className="lt-coupon-apply" onClick={applyCoupon}>Apply</button>
        </div>
        {couponMsg && <p className={`lt-coupon-msg ${couponDiscount > 0 ? "lt-coupon-ok" : "lt-coupon-err"}`}>{couponMsg}</p>}
        <p className="lt-hint">Try: SAVE100 for ₹100 off</p>
      </div>

      <div className="lt-co-card">
        <h4 className="lt-section-label">Bill Summary</h4>
        <div className="lt-bill-row"><span>Cart value</span><span><AnimatedNumber value={totalMrp} format={fmtRupeesInt} /></span></div>
        <div className="lt-bill-row"><span>Saving&apos;s on MRP</span><span className="lt-saving">-<AnimatedNumber value={savings} format={fmtRupeesInt} /></span></div>
        <div className="lt-bill-row"><span>Coupon Discount</span><span className={couponDiscount > 0 ? "lt-saving" : ""}>-<AnimatedNumber value={couponDiscount} format={fmtRupeesInt} /></span></div>
        <div className="lt-bill-row"><span>Home Collection Charge</span><span>₹0</span></div>
        <div className="lt-bill-divider" />
        <div className="lt-bill-row lt-savings-row"><span>Total Savings</span><span><AnimatedNumber value={savings + couponDiscount} format={fmtRupeesInt} /></span></div>
        <div className="lt-bill-row lt-order-total-row"><span>Order Total</span><span><AnimatedNumber value={orderTotal} format={fmtRupeesInt} /></span></div>
      </div>

      {error && <p className="lt-error" style={{ padding: "0 0 1rem" }}>{error}</p>}

      <div className="lt-cart-footer">
        <div><p className="lt-cart-footer-label">Total Amount</p><p className="lt-cart-footer-total"><AnimatedNumber value={orderTotal} format={fmtRupeesInt} /></p></div>
        <button className="lt-proceed-btn" onClick={handleBook} disabled={booking || !profile?.patientId}>
          {booking ? "Booking…" : "Confirm Booking"}
        </button>
      </div>
    </>
  );
}

// ── Success View ──────────────────────────────────────────────────────────────
function SuccessView({ orderId, isPending }) {
  const router = useRouter();
  const isProcessing = orderId === "PROCESSING";
  return (
    <div className="lt-success-wrap">
      <div className="lt-success-card animate-fade-in">
        <div className="lt-success-icon">{isProcessing ? "⏳" : isPending ? "🕐" : "✅"}</div>
        <h2>{isProcessing ? "Booking Processing..." : isPending ? "Order Placed!" : "Booking Confirmed!"}</h2>
        {isProcessing ? (
          <>
            <p>Your booking has been received and is being confirmed by the lab partner.</p>
            <p style={{ marginTop: "0.5rem" }}>This usually takes <strong>2–3 minutes</strong>. Please check your profile shortly to see the confirmed order.</p>
          </>
        ) : isPending ? (
          <p>Your order is placed and <strong>payment is pending</strong>. Our team will contact you to complete the booking.</p>
        ) : (
          <p>A phlebotomist will visit you for doorstep sample collection.</p>
        )}
        {!isProcessing && (
          <div className="lt-order-id-box">
            <span>Order ID</span>
            <strong>{orderId}</strong>
          </div>
        )}
        <p className="lt-hint" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          {isProcessing ? "You will receive a confirmation once the booking is processed." : "Digital reports will be available within 24 hours of sample collection."}
        </p>
        <button className="lt-btn-submit" onClick={() => router.push("/consultancy/profile?tab=labtests")}>
          {isProcessing ? "Check Profile" : "Track Order"}
        </button>
        <button className="lt-btn-submit" style={{ marginTop: "0.5rem", background: "#f1f5f9", color: "#1a1f36" }} onClick={() => router.push("/consultancy/lab-tests")}>
          Add More Tests
        </button>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartPageContent />
    </Suspense>
  );
}

function CartPageContent() {
  const searchParams = useSearchParams();
  const [tab,      setTab]      = useState(searchParams.get("tab") === "medicines" ? "medicines" : "lab");
  const [view,     setView]     = useState("cart"); // cart | slots | checkout | med-order | success
  const [labCart,  setLabCart]  = useState([]);
  const [medCart,  setMedCart]  = useState([]);
  const [location, setLocation] = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [slotInfo, setSlotInfo] = useState(null);
  const [orderId,  setOrderId]  = useState(null);
  const [isPending,setIsPending]= useState(false);
  const [medOrderId, setMedOrderId] = useState(null);

  useEffect(() => {
    // Load carts from localStorage
    try { const c = JSON.parse(localStorage.getItem("ltCart")  || "[]"); setLabCart(c); } catch {}
    try { const m = JSON.parse(localStorage.getItem("medCart") || "[]"); setMedCart(m); } catch {}

    // Load profile
    const email     = localStorage.getItem("userEmail")   || "";
    const name      = localStorage.getItem("userName")    || "";
    const phone     = localStorage.getItem("userPhone")   || "";
    const gender    = localStorage.getItem("userGender")  || "";
    const cachedPid = email ? localStorage.getItem(`meradocPatientId_${email}`) : null;
    setProfile({ email, name, phone, gender, patientId: cachedPid, age: null });

    if (email) {
      fetch(`/api/users?email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then(({ user }) => { if (user) setProfile((p) => ({ ...p, name: user.name || p.name, gender: user.gender || p.gender || "", age: ageFromDob(user.dob) })); })
        .catch(() => {});

      // Always fetch from DB — overrides stale localStorage values
      fetch(`/api/meradoc/patient?email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then(({ patientId }) => { if (patientId) { localStorage.setItem(`meradocPatientId_${email}`, patientId); setProfile((p) => ({ ...p, patientId })); } })
        .catch(() => {});

      // Load address from DB (per-email), fallback to per-email localStorage
      fetch(`/api/lab-test-address?email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then(({ location }) => {
          if (location) {
            localStorage.setItem(`ltLocation_${email}`, JSON.stringify(location));
            setLocation(location);
          } else {
            // fallback: per-email localStorage key only
            try { const loc = JSON.parse(localStorage.getItem(`ltLocation_${email}`) || "null"); if (loc) setLocation(loc); } catch {}
          }
        })
        .catch(() => {
          try { const loc = JSON.parse(localStorage.getItem(`ltLocation_${email}`) || "null"); if (loc) setLocation(loc); } catch {}
        });
    }
  }, []);

  const medCount = medCart.reduce((s, i) => s + i.qty, 0);

  if (view === "success")     return <SuccessView orderId={orderId} isPending={isPending} />;
  if (view === "med-success") return (
    <div className="lt-success-wrap">
      <div className="lt-success-card animate-fade-in">
        <div className="lt-success-icon">✅</div>
        <h2>Order Placed!</h2>
        <p>Your medicines will be delivered to your address.</p>
        {medOrderId && medOrderId !== "N/A" && (
          <div className="lt-order-id-box"><span>Order ID</span><strong>{medOrderId}</strong></div>
        )}
        <button className="lt-btn-submit" onClick={() => window.location.href = "/consultancy/profile?tab=medorders"} style={{ marginTop: "1rem" }}>
          Track Order
        </button>
        <button className="lt-btn-submit" onClick={() => window.location.href = "/consultancy/medicines"} style={{ marginTop: "0.5rem", background: "#f1f5f9", color: "#1a1f36" }}>
          Order More Medicines
        </button>
      </div>
    </div>
  );

  return (
    <div className="lt-cart-wrap" style={{ maxWidth: 860, margin: "2rem auto", padding: "0 1rem 6rem" }}>
      {/* Tabs — only shown on cart view */}
      {view === "cart" && (
        <div className="cart-tabs">
          <button className={`cart-tab ${tab === "medicines" ? "active" : ""}`} onClick={() => setTab("medicines")}>
            💊 Medicines (<AnimatedNumber value={medCount} format={fmtCount} />)
          </button>
          <button className={`cart-tab ${tab === "lab" ? "active" : ""}`} onClick={() => setTab("lab")}>
            🧪 Lab Tests (<AnimatedNumber value={labCart.length} format={fmtCount} />)
          </button>
        </div>
      )}

      {view === "cart" && (
        <CartView
          tab={tab}
          labCart={labCart}
          setLabCart={setLabCart}
          medCart={medCart}
          setMedCart={setMedCart}
          location={location}
          onProceed={() => setView("slots")}
          onMedProceed={() => setView("med-order")}
        />
      )}

      {view === "med-order" && (
        <MedOrderView
          medCart={medCart}
          location={location}
          onBack={() => setView("cart")}
          onDone={(id) => { setMedOrderId(id); setView("med-success"); }}
        />
      )}

      {view === "slots" && (
        <SlotView
          labCart={labCart}
          location={location}
          profile={profile}
          onBack={() => setView("cart")}
          onConfirm={(info) => { setSlotInfo(info); setView("checkout"); }}
        />
      )}

      {view === "checkout" && (
        <CheckoutView
          labCart={labCart}
          location={location}
          slotInfo={slotInfo}
          profile={profile}
          onBack={() => setView("slots")}
          onDone={(id, pending) => { setOrderId(id); setIsPending(pending); setView("success"); }}
        />
      )}
    </div>
  );
}
