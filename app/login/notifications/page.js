"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import "../login.css"; // Reuse progress bar and global styles
import "./notifications.css";

function NotificationPermissionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userName = searchParams.get("name") || "";

  const currentStep = 6;
  const totalSteps = 7;

  const navigateNext = () => {
    // Navigate to Success screen
    console.log("Navigating to Success Screen");
    router.push(`/login/success?name=${encodeURIComponent(userName)}`);
  };

  const handleAllow = () => {
    console.log("Allow notifications pressed");
    navigateNext();
  };

  const handleLater = () => {
    console.log("Later pressed");
    navigateNext();
  };

  return (
    <div className="notifications-page">
      <Reveal className="notifications-inner">
        {/* ── Progress bar (reuses login.css classes) ── */}
        <div className="progress-bar-track">
          <div className="progress-bar-done" style={{ flex: currentStep - 1 }} />
          <div
            className="progress-bar-remaining"
            style={{ flex: totalSteps - (currentStep - 1) }}
          />
        </div>

        <p className="step-label">
          Step {currentStep} of {totalSteps}
        </p>

        <div className="divider" />

        {/* ── Centered form content ── */}
        <div className="form-area" style={{ flex: 1, justifyContent: "center" }}>
          
          <div className="bell-icon-container">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" />
            </svg>
          </div>

          <h1>Stay connected</h1>
          <p className="subtitle">
            Get instant updates about your documents,<br />
            transactions, and important reminders from<br />
            home
          </p>

          <Stagger className="features-list">
            <StaggerItem className="feature-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>Document expiry alerts</span>
            </StaggerItem>
            <StaggerItem className="feature-item">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>Transaction confirmations</span>
            </StaggerItem>
            <StaggerItem className="feature-item">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>Property updates</span>
            </StaggerItem>
          </Stagger>

          <button
            className="btn-continue"
            onClick={handleAllow}
          >
            Allow notifications
          </button>
          
          <button
            className="btn-later"
            onClick={handleLater}
          >
            Later
          </button>

          <div className="bottom-divider" />

          <button className="btn-back" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </Reveal>
    </div>
  );
}

export default function NotificationPermissionScreen() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotificationPermissionInner />
    </Suspense>
  );
}
