"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DiagnosticService } from "../../../../services/diagnostic.service";
import { UserService } from "../../../../services/user.service";
import "../lab-tests.css";

async function saveLocation(loc) {
  const email = localStorage.getItem("userEmail") || "";
  if (email) {
    localStorage.setItem(`ltLocation_${email}`, JSON.stringify(loc));
    localStorage.setItem("ltDeliveryCity", loc.city || "");

    await fetch("/api/lab-test-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, location: loc }),
    }).catch(() => {});

    const patientId = localStorage.getItem(`meradocPatientId_${email}`) || "";
    if (patientId) {
      const userName  = localStorage.getItem("userName")  || "Patient";
      const userPhone = localStorage.getItem("userPhone") || "";
      const meraLoc   = { ...loc, name: userName, mobileNumber: userPhone.replace(/^\+\d+\s?/, "") };

      // Always create a new address so the addressId reflects the latest location
      fetch("/api/meradoc/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, patientId, location: meraLoc }),
      }).catch(() => {});
    }
  }
  window.dispatchEvent(new Event("lt-nav-update"));
}

// ── Status card shown after availability check ────────────────────────────────
function ServiceCard({ icon, label, available, message }) {
  const ok = available === true;
  const na = available === false;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "0.75rem",
      padding: "0.85rem 1rem", borderRadius: 10, marginBottom: "0.6rem",
      background: ok ? "#f0fdf4" : na ? "#fef2f2" : "#f9fafb",
      border: `1px solid ${ok ? "#86efac" : na ? "#fca5a5" : "#e5e7eb"}`,
    }}>
      <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1a1f36", margin: "0 0 0.2rem" }}>{label}</p>
        <p style={{ fontSize: "0.8rem", margin: 0, color: ok ? "#166534" : na ? "#991b1b" : "#6b7280" }}>
          {ok ? "✓ Available at this address" : na ? `✕ ${message}` : "Checking…"}
        </p>
      </div>
    </div>
  );
}

export default function LabTestsAddressPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const forMedicines = searchParams.get("for") === "medicines";
  const fromNav      = searchParams.get("from") === "nav";

  const [mode,      setMode]      = useState(null); // null | "gps" | "manual"
  const [address,   setAddress]   = useState("");
  const [pincode,   setPincode]   = useState("");
  const [coords,    setCoords]    = useState(null);
  const [locating,  setLocating]  = useState(false);
  const [checking,  setChecking]  = useState(false);
  const [error,     setError]     = useState("");

  // Availability results (shown after check)
  const [labStatus, setLabStatus] = useState(null); // null | true | false
  const [medStatus, setMedStatus] = useState(null); // null | true | false
  const [checked,   setChecked]   = useState(false);

  const resetStatus = () => { setLabStatus(null); setMedStatus(null); setChecked(false); };

  const useGPS = () => {
    if (!navigator.geolocation) { setError("Geolocation not supported by your browser."); return; }
    setMode("gps"); setLocating(true); setError(""); resetStatus();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, long: lon });
        try {
          const res  = await fetch(`/api/pincode?lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data.addressText) setAddress(data.addressText);
          if (data.pincode)     setPincode(data.pincode);
        } catch {}
        setLocating(false);
      },
      () => {
        setError("Location access denied. Please allow location or fill manually.");
        setLocating(false); setMode(null);
      }
    );
  };

  const canSubmit = address.trim() && pincode.length === 6 && (coords || mode === "manual");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setChecking(true); setError(""); resetStatus();

    try {
      let lat = coords?.lat, lon = coords?.long;
      if (mode === "manual" && !coords) {
        const pRes  = await fetch(`/api/pincode?pincode=${pincode}`);
        const pData = await pRes.json();
        lat = pData.lat || 0;
        lon = pData.lon || 0;
      }

      await UserService.generateToken();

      // ── Run lab + medicine checks + pincode lookup in parallel ───────────────
      const [labData, pinData, medSearch] = await Promise.all([
        DiagnosticService.checkServiceability({ zipcode: pincode, lat, long: lon }),
        fetch(`/api/pincode?pincode=${pincode}&lat=${lat}&lon=${lon}`).then(r => r.json()).catch(() => null),
        // Probe medicine deliverability: search a common drug at this pincode
        // If PharmEasy returns results, pharmacy delivers here
        fetch(`/api/medicine/search?search=paracetamol&pincode=${pincode}&size=1`)
          .then(r => r.json()).catch(() => null),
      ]);

      // ── Resolve lab serviceability ───────────────────────────────────────────
      const partners    = Array.isArray(labData?.data) ? labData.data : (labData?.data ? [labData.data] : []);
      const labOk       = partners.length > 0
        ? partners.some(p => p.serviceable !== false)
        : (labData?.isServiceable ?? true);

      const anyWithIds = partners.find(p => p.zoneId) || partners[0] || {};
      const city  = anyWithIds.city  || pinData?.city  || "";
      const state = anyWithIds.state || pinData?.state || "";

      // ── Resolve medicine deliverability ──────────────────────────────────────
      const medList = medSearch?.data?.list || [];
      const medOk   = medList.length > 0;

      // ── Always save the address ──────────────────────────────────────────────
      const loc = {
        addressLine1: address.trim(), pincode, lat: String(lat), long: String(lon),
        city, state,
        partners: partners.map(p => ({
          partner: p.partner || "",
          cityId:  p.cityId  != null ? String(p.cityId)  : "",
          stateId: p.stateId != null ? String(p.stateId) : "",
          zoneId:  p.zoneId  != null ? String(p.zoneId)  : "",
        })),
        cityId:  anyWithIds.cityId  != null ? String(anyWithIds.cityId)  : "",
        stateId: anyWithIds.stateId != null ? String(anyWithIds.stateId) : "",
        zoneId:  anyWithIds.zoneId  != null ? String(anyWithIds.zoneId)  : "",
      };
      await saveLocation(loc);

      // ── Show results ─────────────────────────────────────────────────────────
      setLabStatus(labOk);
      setMedStatus(medOk);
      setChecked(true);

      // If both are available and coming from lab tests flow, auto-redirect
      if (!fromNav && !forMedicines && labOk) {
        router.push("/consultancy/lab-tests");
      }
    } catch (err) {
      setError(err.message || "Could not save address. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleContinue = () => {
    if (forMedicines) router.push("/consultancy/cart?tab=medicines");
    else              router.push("/consultancy");
  };

  // ── Mode selection ────────────────────────────────────────────────────────────
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

  // ── GPS locating spinner ──────────────────────────────────────────────────────
  if (mode === "gps" && locating) return (
    <div className="lt-address-wrap">
      <div className="lt-address-card animate-fade-in" style={{ textAlign: "center" }}>
        <div className="apt-spinner-sm" style={{ margin: "1rem auto" }} />
        <p>Detecting your location…</p>
      </div>
    </div>
  );

  // ── Address form ──────────────────────────────────────────────────────────────
  return (
    <div className="lt-address-wrap">
      <div className="lt-address-card animate-fade-in">
        <button
          className="lt-back-btn"
          style={{ marginBottom: "1rem" }}
          onClick={() => { setMode(null); setCoords(null); setAddress(""); setPincode(""); setError(""); resetStatus(); }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>

        <h2>{mode === "gps" ? "Confirm Your Address" : "Enter Delivery Address"}</h2>
        {mode === "gps" && coords && <p className="lt-loc-hint">📍 Location detected — please confirm or edit below</p>}

        <form onSubmit={handleSubmit}>
          <textarea
            className="lt-input lt-textarea"
            placeholder="House / flat no., street, landmark…"
            value={address}
            onChange={e => { setAddress(e.target.value); resetStatus(); }}
            rows={3}
          />
          <input
            type="text"
            className="lt-input"
            placeholder="Pincode (6 digits)"
            maxLength={6}
            value={pincode}
            onChange={e => { setPincode(e.target.value.replace(/\D/g, "")); resetStatus(); }}
          />

          {error && <p className="lt-error">{error}</p>}

          {/* Availability results — shown after check */}
          {checked && (
            <div style={{ margin: "0.75rem 0" }}>
              <ServiceCard
                icon="🔬"
                label="Lab Tests (Home Collection)"
                available={labStatus}
                message="Home collection not available at this pincode"
              />
              <ServiceCard
                icon="💊"
                label="Medicine Delivery"
                available={medStatus}
                message="Medicine delivery not available at this pincode"
              />
            </div>
          )}

          {checked ? (
            <button type="button" className="lt-btn-submit" onClick={handleContinue}>
              Continue →
            </button>
          ) : (
            <button type="submit" className="lt-btn-submit" disabled={!canSubmit || checking}>
              {checking ? "Checking availability…" : "Check & Save Address"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
