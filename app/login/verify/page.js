"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import "../login.css";
import "./verify.css";

const HARDCODED_PASSWORD = "123456";

function VerifyNumberInner() {
  const router = useRouter();

  const currentStep = 3;
  const totalSteps  = 7;

  const [password, setPassword]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState("");
  const inputRef = useRef(null);

  const handleVerify = () => {
    if (password !== HARDCODED_PASSWORD) {
      setError("Incorrect password. Please try again.");
      setPassword("");
      inputRef.current?.focus();
      return;
    }
    router.push("/login/about");
  };

  return (
    <div className="verify-page">
      <div className="verify-inner">
        {/* Progress bar */}
        <div className="progress-bar-track">
          <div className="progress-bar-done"      style={{ flex: currentStep - 1 }} />
          <div className="progress-bar-remaining" style={{ flex: totalSteps - (currentStep - 1) }} />
        </div>
        <p className="step-label">Step {currentStep} of {totalSteps}</p>
        <div className="divider" />

        <div className="verify-form-area">
          <h1>Create a Password</h1>
          <p className="verify-subtitle">Set a password to secure your account</p>

          {/* Password input */}
          <div className="password-field">
            <input
              ref={inputRef}
              className="password-input"
              type={showPass ? "text" : "password"}
              placeholder="Create your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              autoFocus
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPass((v) => !v)}
              aria-label="Toggle password visibility"
            >
              {showPass ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {error && <p className="verify-error">{error}</p>}

          <button
            className="btn-verify"
            disabled={!password}
            onClick={handleVerify}
          >
            Continue
          </button>

          <div className="bottom-divider" />
          <button className="btn-back" onClick={() => router.back()}>Back</button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyNumberPage() {
  return (
    <Suspense fallback={<div className="verify-page"><div className="verify-inner" /></div>}>
      <VerifyNumberInner />
    </Suspense>
  );
}
