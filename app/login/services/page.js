"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import "../login.css"; // Reuse progress bar and global styles
import "./services.css";

// The icons match the user's intent:
// Document: Icons.description_outlined -> Document icon
// Finance: Icons.account_balance_wallet_outlined -> Wallet icon
// Property: Icons.home_outlined -> Home icon
// Other: Icons.favorite_border -> Heart/Star icon

const AVAILABLE_SERVICES = [
  {
    id: 1,
    name: "Document processing",
    description: "Visas, passports, attestations & more",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="service-icon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
  {
    id: 2,
    name: "Financial planning",
    description: "Remittances, investments & accounts",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="service-icon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
        />
      </svg>
    ),
  },
  {
    id: 3,
    name: "Real estate / Property",
    description: "Buying, selling & renting services",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="service-icon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    ),
  },
  {
    id: 4,
    name: "Healthcare",
    description: "Insurance & medical consultations",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="service-icon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    ),
  },
];

function ServicesSelectionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userName = searchParams.get("name") || "";

  // Keep track of selected service IDs - using a Set for easy toggling natively,
  // but array works better with basic React state updates
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = 5;
  const totalSteps = 7;

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (selectedIds.length === 0) return;
    
    setIsLoading(true);
    // Simulate API call for saving the customer profile / selected services
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);

    // After this, according to Flutter it goes to NotificationPermissionScreen (Step 6)
    // We'll console log then alert or navigate to next placeholder
    console.log("Selected Services:", selectedIds);
    // Navigate to Notifications screen (Step 6)
    router.push(`/login/notifications?name=${encodeURIComponent(userName)}`);
  };

  return (
    <div className="services-page">
      <div className="services-inner">
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
          <h1>What matters most to you?</h1>
          <p className="subtitle">
            Choose the services you&apos;d like to explore first
          </p>

          <div className="services-list">
            {AVAILABLE_SERVICES.map((service) => {
              const isSelected = selectedIds.includes(service.id);
              return (
                <div
                  key={service.id}
                  className={`service-option ${isSelected ? "selected" : ""}`}
                  onClick={() => toggleSelection(service.id)}
                >
                  <div className="service-checkbox">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>

                  {service.icon}

                  <div className="service-text">
                    <h3 className="service-title">{service.name}</h3>
                    <p className="service-desc">{service.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="btn-continue"
            disabled={selectedIds.length === 0 || isLoading}
            onClick={handleContinue}
          >
            {isLoading ? (
              <span className="loading-spinner">...</span> // You usually replace this with an actual spinner
            ) : (
              "Continue"
            )}
          </button>

          <div className="bottom-divider" />

          <button className="btn-back" onClick={() => router.back()}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesSelectionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ServicesSelectionInner />
    </Suspense>
  );
}


