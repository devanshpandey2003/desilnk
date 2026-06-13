"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DiagnosticService } from "../../../../services/diagnostic.service";
import { UserService } from "../../../../services/user.service";
import "../lab-tests.css";

async function saveLocation(loc) {
  const email = localStorage.getItem("userEmail") || "";
  if (email) {
    localStorage.setItem(`ltLocation_${email}`, JSON.stringify(loc));
    localStorage.setItem("ltDeliveryCity", loc.city || "");

    // Persist to our DB
    await fetch("/api/lab-test-address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, location: loc }),
    }).catch(() => {});

    // Also create/update in MeraDoc so we have an addressId for medicine orders
    const patientId = localStorage.getItem(`meradocPatientId_${email}`) || "";
    if (patientId) {
      const userName   = localStorage.getItem("userName")  || "Patient";
      const userPhone  = localStorage.getItem("userPhone") || "";
      fetch("/api/meradoc/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          patientId,
          location: { ...loc, name: userName, mobileNumber: userPhone.replace(/^\+\d+\s?/, "") },
        }),
      }).catch(() => {});
    }
  }
  window.dispatchEvent(new Event("lt-nav-update"));
}

export default function LabTestsAddressPage() {
  const router  = useRouter();
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
        setLocating(false);
        setMode(null);
      }
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
      const serviceable = partners.length > 0
        ? partners.some((p) => p.serviceable !== false)
        : (data?.isServiceable ?? true);
      if (!serviceable) { setError("Home collection not available at this pincode yet."); return; }

      const anyWithIds = partners.find((p) => p.zoneId) || partners[0] || {};
      const city  = anyWithIds.city  || pinData?.city  || "";
      const state = anyWithIds.state || pinData?.state || "";

      const loc = {
        addressLine1: address.trim(), pincode, lat: String(lat), long: String(lon),
        city, state,
        partners: partners.map((p) => ({
          partner: p.partner || "",
          cityId:  p.cityId  != null ? String(p.cityId)  : "",
          stateId: p.stateId != null ? String(p.stateId) : "",
          zoneId:  p.zoneId  != null ? String(p.zoneId)  : "",
        })),
        cityId:  anyWithIds.cityId  != null ? String(anyWithIds.cityId)  : "",
        stateId: anyWithIds.stateId != null ? String(anyWithIds.stateId) : "",
        zoneId:  anyWithIds.zoneId  != null ? String(anyWithIds.zoneId)  : "",
      };

      saveLocation(loc);
      router.push("/consultancy/lab-tests");
    } catch (err) {
      setError(err.message || "Serviceability check failed.");
    } finally {
      setChecking(false);
    }
  };

  // ── Mode selection ──────────────────────────────────────────────────────────
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

  // ── GPS locating spinner ────────────────────────────────────────────────────
  if (mode === "gps" && locating) return (
    <div className="lt-address-wrap">
      <div className="lt-address-card animate-fade-in" style={{ textAlign: "center" }}>
        <div className="apt-spinner-sm" style={{ margin: "1rem auto" }} />
        <p>Detecting your location…</p>
      </div>
    </div>
  );

  // ── Address form ────────────────────────────────────────────────────────────
  return (
    <div className="lt-address-wrap">
      <div className="lt-address-card animate-fade-in">
        <button
          className="lt-back-btn"
          style={{ marginBottom: "1rem" }}
          onClick={() => { setMode(null); setCoords(null); setAddress(""); setPincode(""); setError(""); }}
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
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
          />
          <input
            type="text"
            className="lt-input"
            placeholder="Pincode (6 digits)"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          />
          {error && <p className="lt-error">{error}</p>}
          <button type="submit" className="lt-btn-submit" disabled={!canSubmit || checking}>
            {checking ? "Checking availability…" : "Check & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
