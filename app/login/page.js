"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

/* ── Country data ── */
const COUNTRIES = [
  { name: "United States",  code: "+1",   flag: "🇺🇸" },
  { name: "Canada",         code: "+1",   flag: "🇨🇦" },
  { name: "United Kingdom", code: "+44",  flag: "🇬🇧" },
  { name: "India",          code: "+91",  flag: "🇮🇳" },
  { name: "Australia",      code: "+61",  flag: "🇦🇺" },
  { name: "Germany",        code: "+49",  flag: "🇩🇪" },
  { name: "France",         code: "+33",  flag: "🇫🇷" },
  { name: "Japan",          code: "+81",  flag: "🇯🇵" },
  { name: "China",          code: "+86",  flag: "🇨🇳" },
  { name: "Brazil",         code: "+55",  flag: "🇧🇷" },
  { name: "Mexico",         code: "+52",  flag: "🇲🇽" },
  { name: "South Korea",    code: "+82",  flag: "🇰🇷" },
  { name: "Italy",          code: "+39",  flag: "🇮🇹" },
  { name: "Spain",          code: "+34",  flag: "🇪🇸" },
  { name: "Netherlands",    code: "+31",  flag: "🇳🇱" },
  { name: "Singapore",      code: "+65",  flag: "🇸🇬" },
  { name: "UAE",            code: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia",   code: "+966", flag: "🇸🇦" },
  { name: "South Africa",   code: "+27",  flag: "🇿🇦" },
  { name: "Russia",         code: "+7",   flag: "🇷🇺" },
];

const VALID_EMAIL = /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/;

export default function CreateAccountPage() {
  const router = useRouter();

  /* form state */
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);

  /* modal state */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  /* focus the search box when modal opens */
  useEffect(() => {
    if (pickerOpen && searchRef.current) searchRef.current.focus();
  }, [pickerOpen]);

  /* validation */
  const isValid = email.trim() !== "" && VALID_EMAIL.test(email.trim()) && phone.trim() !== "";

  /* filtered country list */
  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().startsWith(search.toLowerCase()) ||
          c.code.startsWith(search)
      )
    : COUNTRIES;

  const [checking, setChecking] = useState(false);

  /* handlers */
  const handleContinue = async () => {
    const trimmedEmail = email.trim();
    const fullPhone = `${country.code} ${phone}`;

    setChecking(true);
    try {
      const res = await fetch(`/api/users?email=${encodeURIComponent(trimmedEmail)}`);
      const data = await res.json();

      if (data.user) {
        // Returning user — restore their data and go straight to dashboard
        localStorage.setItem("userEmail", trimmedEmail);
        localStorage.setItem("userPhone", data.user.phone || fullPhone);
        localStorage.setItem("userName", data.user.name || "");
        localStorage.setItem("userCountry", data.user.country || "");
        router.push(`/dashboard?name=${encodeURIComponent(data.user.name || "")}`);
        return;
      }
    } catch (err) {
      console.error("User lookup failed:", err);
    } finally {
      setChecking(false);
    }

    // New user — proceed with onboarding
    localStorage.setItem("userEmail", trimmedEmail);
    localStorage.setItem("userPhone", fullPhone);
    router.push(`/login/verify?phone=${encodeURIComponent(fullPhone)}`);
  };

  const selectCountry = (c) => {
    setCountry(c);
    setSearch("");
    setPickerOpen(false);
  };

  /* step progress (step 2 / 7) */
  const currentStep = 2;
  const totalSteps = 7;

  return (
    <div className="create-account">
      <div className="create-account-inner">
        {/* ── Progress bar ── */}
        <div className="progress-bar-track">
          <div
            className="progress-bar-done"
            style={{ flex: currentStep - 1 }}
          />
          <div
            className="progress-bar-remaining"
            style={{ flex: totalSteps - (currentStep - 1) }}
          />
        </div>

        <p className="step-label">Step {currentStep} of {totalSteps}</p>
        <div className="divider" />

        {/* ── Centered form ── */}
        <div className="form-area">
          <h1>Create your account</h1>
          <p className="subtitle">Let&apos;s get you connected to home</p>

          {/* Email */}
          <div className="input-group">
            <label htmlFor="email-input">Email address</label>
            <input
              id="email-input"
              className="input-box"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="input-group">
            <label htmlFor="phone-input">Phone number</label>
            <div className="phone-row">
              <button
                type="button"
                className="country-picker-btn"
                onClick={() => setPickerOpen(true)}
                aria-label="Select country code"
              >
                <span className="flag">{country.flag}</span>
                <span className="code">{country.code}</span>
                <span className="arrow">▼</span>
              </button>

              <input
                id="phone-input"
                className="phone-input"
                type="tel"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Terms */}
          <p className="terms-text">
            By continuing, you agree to our{" "}
            <a href="#">Terms of Service</a> and{" "}
            <a href="#">Privacy Policy</a>
          </p>

          {/* Continue */}
          <button
            className="btn-continue"
            disabled={!isValid || checking}
            onClick={handleContinue}
          >
            {checking ? "Checking..." : "Continue"}
          </button>

          <div className="bottom-divider" />

          {/* Back */}
          <button className="btn-back" onClick={() => router.push("/")}>
            Back
          </button>
        </div>
      </div>

      {/* ── Country picker modal ── */}
      {pickerOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPickerOpen(false);
              setSearch("");
            }
          }}
        >
          <div className="modal-sheet">
            <div className="modal-header">
              <button
                className="modal-close"
                onClick={() => { setPickerOpen(false); setSearch(""); }}
                aria-label="Close"
              >
                ✕
              </button>
              <h2>Select Country</h2>
            </div>

            <div className="modal-search">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search country or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <ul className="country-list">
              {filtered.map((c, i) => (
                <li
                  key={`${c.flag}-${i}`}
                  className={c.flag === country.flag && c.name === country.name ? "selected" : ""}
                  onClick={() => selectCountry(c)}
                >
                  <span className="flag">{c.flag}</span>
                  <span className="name">{c.name}</span>
                  <span className="dial-code">{c.code}</span>
                </li>
              ))}
              {filtered.length === 0 && (
                <li style={{ justifyContent: "center", color: "#9ca3af", cursor: "default" }}>
                  No results found
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
