"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Reveal } from "@/components/motion";
import "../login.css"; // Reuse progress bar and modal styles
import "./about.css";

const COUNTRIES = [
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'Russia', code: '+7', flag: '🇷🇺' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
];

export default function AboutYourselfPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]); // Default UAE

  /* modal state */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    if (pickerOpen && searchRef.current) searchRef.current.focus();
  }, [pickerOpen]);

  /* validation */
  const isValid = name.trim().length > 0;

  /* filter countries */
  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search)
      )
    : COUNTRIES;

  const selectCountry = (c) => {
    setCountry(c);
    setSearch("");
    setPickerOpen(false);
  };

  const handleContinue = async () => {
    const email = localStorage.getItem("userEmail");
    const phone = localStorage.getItem("userPhone");

    localStorage.setItem("userName", name.trim());
    localStorage.setItem("userCountry", country.name);

    if (email && phone) {
      try {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, phone, name: name.trim(), country: country.name }),
        });
      } catch (err) {
        console.error("Failed to save user:", err);
      }
    }

    router.push(`/login/services?name=${encodeURIComponent(name)}`);
  };

  const currentStep = 4;
  const totalSteps = 7;

  return (
    <div className="about-page">
      <Reveal className="about-inner">
        {/* ── Progress bar ── */}
        <div className="progress-bar-track">
          <div className="progress-bar-done" style={{ flex: currentStep - 1 }} />
          <div
            className="progress-bar-remaining"
            style={{ flex: totalSteps - (currentStep - 1) }}
          />
        </div>

        <p className="step-label">Step {currentStep} of {totalSteps}</p>
        <div className="divider" />

        {/* ── Centered form ── */}
        <div className="about-form-area">
          <h1>Tell us a little about yourself</h1>
          <p className="subtitle">Help us personalize your experience</p>

          {/* Name Field */}
          <div className="about-input-group">
            <label htmlFor="name-input">Name - First name will do</label>
            <input
              id="name-input"
              className="about-input-box"
              type="text"
              placeholder="Enter your first name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Country Field */}
          <div className="about-input-group">
            <label>Current country of residence</label>
            <div
              className="country-selector-box"
              onClick={() => setPickerOpen(true)}
            >
              <span className="flag">{country.flag}</span>
              <span className="name">{country.name}</span>
              <span className="arrow">▼</span>
            </div>
          </div>

          <div style={{ marginTop: "8px" }} />

          {/* Continue button (reusing login.css class) */}
          <button
            className="btn-continue"
            disabled={!isValid}
            onClick={handleContinue}
          >
            Continue
          </button>

          <div className="bottom-divider" />

          <button className="btn-back" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </Reveal>

      {/* ── Country picker modal (reusing login.css) ── */}
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
                onClick={() => {
                  setPickerOpen(false);
                  setSearch("");
                }}
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
                  key={`${c.code}-${i}`}
                  className={
                    c.flag === country.flag && c.name === country.name
                      ? "selected"
                      : ""
                  }
                  onClick={() => selectCountry(c)}
                >
                  <span className="flag">{c.flag}</span>
                  <span className="name">{c.name}</span>
                  <span className="dial-code">{c.code}</span>
                </li>
              ))}
              {filtered.length === 0 && (
                <li
                  style={{
                    justifyContent: "center",
                    color: "#9ca3af",
                    cursor: "default",
                  }}
                >
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
