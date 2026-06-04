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

  /* mode */
  const [mode, setMode] = useState("signin"); // "signin" | "register"

  /* shared */
  const [email, setEmail] = useState("");

  /* register only */
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  /* async state */
  const [checking, setChecking] = useState(false);
  const [signinError, setSigninError] = useState("");

  useEffect(() => {
    if (pickerOpen && searchRef.current) searchRef.current.focus();
  }, [pickerOpen]);

  /* reset error when email changes */
  useEffect(() => { setSigninError(""); }, [email]);

  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().startsWith(search.toLowerCase()) ||
          c.code.startsWith(search)
      )
    : COUNTRIES;

  /* ── Sign In ── */
  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !VALID_EMAIL.test(trimmedEmail)) return;
    setChecking(true);
    setSigninError("");
    try {
      const res  = await fetch(`/api/users?email=${encodeURIComponent(trimmedEmail)}`);
      const data = await res.json();
      if (data.user) {
        localStorage.setItem("userEmail",   trimmedEmail);
        localStorage.setItem("userPhone",   data.user.phone   || "");
        localStorage.setItem("userName",    data.user.name    || "");
        localStorage.setItem("userCountry", data.user.country || "");
        router.push(`/dashboard?name=${encodeURIComponent(data.user.name || "")}`);
      } else {
        setSigninError("No account found with this email. Please create an account.");
      }
    } catch {
      setSigninError("Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  /* ── Register ── */
  const isRegisterValid = email.trim() !== "" && VALID_EMAIL.test(email.trim()) && phone.trim() !== "";

  const handleRegister = async () => {
    const trimmedEmail = email.trim();
    const fullPhone    = `${country.code} ${phone}`;
    setChecking(true);
    try {
      const res  = await fetch(`/api/users?email=${encodeURIComponent(trimmedEmail)}`);
      const data = await res.json();
      if (data.user) {
        localStorage.setItem("userEmail",   trimmedEmail);
        localStorage.setItem("userPhone",   data.user.phone || fullPhone);
        localStorage.setItem("userName",    data.user.name  || "");
        localStorage.setItem("userCountry", data.user.country || "");
        router.push(`/dashboard?name=${encodeURIComponent(data.user.name || "")}`);
        return;
      }
    } catch {}
    finally { setChecking(false); }

    localStorage.setItem("userEmail", trimmedEmail);
    localStorage.setItem("userPhone", fullPhone);
    router.push(`/login/verify?phone=${encodeURIComponent(fullPhone)}`);
  };

  const selectCountry = (c) => {
    setCountry(c);
    setSearch("");
    setPickerOpen(false);
  };

  const switchMode = (m) => {
    setMode(m);
    setEmail("");
    setPhone("");
    setSigninError("");
  };

  return (
    <div className="create-account">
      <div className="create-account-inner">

        {/* ── Progress bar (only for register) ── */}
        {mode === "register" && (
          <>
            <div className="progress-bar-track">
              <div className="progress-bar-done"    style={{ flex: 1 }} />
              <div className="progress-bar-remaining" style={{ flex: 6 }} />
            </div>
            <p className="step-label">Step 2 of 7</p>
            <div className="divider" />
          </>
        )}

        <div className="form-area" style={mode === "signin" ? { justifyContent: "center" } : {}}>

          {/* ── Mode toggle ── */}
          <div className="auth-toggle">
            <button
              className={`auth-toggle-btn ${mode === "signin" ? "active" : ""}`}
              onClick={() => switchMode("signin")}
            >
              Sign In
            </button>
            <button
              className={`auth-toggle-btn ${mode === "register" ? "active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Create Account
            </button>
          </div>

          {/* ── Sign In mode ── */}
          {mode === "signin" && (
            <>
              <h1 style={{ marginTop: "28px" }}>Welcome back</h1>
              <p className="subtitle">Sign in with your registered email</p>

              <div className="input-group">
                <label htmlFor="signin-email">Email address</label>
                <input
                  id="signin-email"
                  className={`input-box ${signinError ? "input-box-error" : ""}`}
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                />
              </div>

              <div className="input-group">
                <label htmlFor="signin-password">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="signin-password"
                    className={`input-box ${password && password !== "123456" ? "input-box-error" : ""}`}
                    type={showPass ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 0 }}
                    aria-label="Toggle password"
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {password && password !== "123456" && (
                  <p style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>Incorrect password</p>
                )}
              </div>

              {signinError && (
                <p className="auth-error">{signinError}</p>
              )}

              <button
                className="btn-continue"
                disabled={!email.trim() || !VALID_EMAIL.test(email.trim()) || password !== "123456" || checking}
                onClick={handleSignIn}
              >
                {checking ? "Signing in…" : "Sign In"}
              </button>

              <div className="bottom-divider" />
              <p className="auth-switch-text">
                New here?{" "}
                <button className="auth-link-btn" onClick={() => switchMode("register")}>
                  Create an account
                </button>
              </p>
            </>
          )}

          {/* ── Create Account mode ── */}
          {mode === "register" && (
            <>
              <h1>Create your account</h1>
              <p className="subtitle">Let&apos;s get you connected to home</p>

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

              <p className="terms-text">
                By continuing, you agree to our{" "}
                <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>
              </p>

              <button
                className="btn-continue"
                disabled={!isRegisterValid || checking}
                onClick={handleRegister}
              >
                {checking ? "Checking…" : "Continue"}
              </button>

              <div className="bottom-divider" />
              <p className="auth-switch-text">
                Already have an account?{" "}
                <button className="auth-link-btn" onClick={() => switchMode("signin")}>
                  Sign in
                </button>
              </p>
            </>
          )}

          <button className="btn-back" onClick={() => router.push("/")}>Back</button>
        </div>
      </div>

      {/* ── Country picker modal ── */}
      {pickerOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { setPickerOpen(false); setSearch(""); } }}
        >
          <div className="modal-sheet">
            <div className="modal-header">
              <button className="modal-close" onClick={() => { setPickerOpen(false); setSearch(""); }}>✕</button>
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
