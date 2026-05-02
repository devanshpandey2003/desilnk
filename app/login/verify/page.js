"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import "../login.css";   /* shared progress bar + back/divider styles */
import "./verify.css";

/* ── Inner component that uses useSearchParams ── */
function VerifyNumberInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get("phone") || "+1 xxxxxxxxxx";

  const currentStep = 3;
  const totalSteps = 7;

  /* 6-digit OTP state */
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  /* resend countdown */
  const [timer, setTimer] = useState(27);
  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  /* focus first box on mount */
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (value, idx) => {
    if (!/^\d?$/.test(value)) return;           // digits only
    const next = [...digits];
    next[idx] = value;
    setDigits(next);

    if (value && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKey = (e, idx) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const isComplete = digits.every((d) => d !== "");

  const handleVerify = () => {
    const code = digits.join("");
    console.log(`Verification code: ${code}\nPhone: ${phoneNumber}`);
    router.push("/login/about");
  };

  return (
    <div className="verify-page">
      <div className="verify-inner">
        {/* ── Progress bar (reuses login.css classes) ── */}
        <div className="progress-bar-track">
          <div className="progress-bar-done" style={{ flex: currentStep - 1 }} />
          <div className="progress-bar-remaining" style={{ flex: totalSteps - (currentStep - 1) }} />
        </div>

        <p className="step-label">Step {currentStep} of {totalSteps}</p>
        <div className="divider" />

        {/* ── Centered content ── */}
        <div className="verify-form-area">
          <h1>Verify your number</h1>

          <p className="verify-subtitle">
            We&apos;ve sent a code to{" "}
            <span className="phone-highlight">{phoneNumber}</span> using
            <br />
            WhatsApp
          </p>

          {/* OTP boxes */}
          <div className="otp-row">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                className="otp-box"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKey(e, i)}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            className="btn-verify"
            disabled={!isComplete}
            onClick={handleVerify}
          >
            Verify
          </button>

          {/* Resend */}
          <div className="resend-section">
            <p className="resend-timer">
              Request new code in 0:{String(timer).padStart(2, "0")}
            </p>
            <p className="resend-alt">
              Don&apos;t have WhatsApp?{" "}
              <a onClick={() => alert("SMS code sent!")}>Send SMS</a>
            </p>
          </div>

          <div className="bottom-divider" />

          <button className="btn-back" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Suspense wrapper (required for useSearchParams) ── */
export default function VerifyNumberPage() {
  return (
    <Suspense fallback={<div className="verify-page"><div className="verify-inner" /></div>}>
      <VerifyNumberInner />
    </Suspense>
  );
}
