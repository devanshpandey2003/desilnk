"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import "../login.css"; // Reuse progress bar and global styles
import "./success.css";

function SuccessInner() {
  const searchParams = useSearchParams();
  const userName = searchParams.get("name") || "there";
  const router = useRouter();

  const currentStep = 7;
  const totalSteps = 7;

  const handleDashboard = () => {
    // Navigate to Dashboard
    router.push(`/dashboard?name=${encodeURIComponent(userName)}`);
  };

  return (
    <div className="success-page">
      <div className="success-inner">
        {/* ── Progress bar (reuses login.css classes) ── */}
        <div className="progress-bar-track" style={{ height: "8px" }}>
          <div className="progress-bar-done" style={{ flex: currentStep }} />
          {/* No remaining bar needed as we are at 7/7 */}
        </div>

        <p className="step-label" style={{ fontWeight: 500, color: "#4b5563", marginTop: "16px" }}>
          Step {currentStep} of {totalSteps}
        </p>

        {/* ── Centered form content ── */}
        <div className="form-area" style={{ flex: 1, justifyContent: "center" }}>
          
          <svg
            className="success-icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              clipRule="evenodd"
            />
          </svg>

          <h1>You&apos;re all set, {userName}!</h1>
          <p className="subtitle">Let&apos;s make India easier for you.</p>

          <button
            className="btn-continue"
            onClick={handleDashboard}
          >
            Go to Dashboard
          </button>

          <div style={{ height: "24px" }} />
        </div>
      </div>
    </div>
  );
}

// Suspense boundary is required when using `useSearchParams` in a client component in Next.js
export default function SuccessScreen() {
  return (
    <Suspense fallback={
        <div className="success-page">
            <div className="success-inner" style={{ justifyContent: "center", alignItems: "center" }}>
                <span>Loading...</span>
            </div>
        </div>
    }>
      <SuccessInner />
    </Suspense>
  );
}
