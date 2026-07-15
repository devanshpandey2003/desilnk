"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDoctors, useGenerateToken } from "../../../../hooks/useApi";
import { Stagger, StaggerItem } from "@/components/motion";
import "../doctors.css";

// Helper icons
const Icons = {
  back: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  heart: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM12 17v-4H8v-2h4V7h2v4h4v2h-4v4h-2z" />
    </svg>
  ),
  filter: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  language: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

function formatAvailability(dateStr) {
  if (!dateStr) return "Check availability";
  try {
    const dt = new Date(dateStr.replace(" ", "T"));
    const now = new Date();
    const isToday = dt.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = dt.toDateString() === tomorrow.toDateString();
    const time = dt.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true });
    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;
    return `${dt.toLocaleDateString("en", { month: "short", day: "numeric" })}, ${time}`;
  } catch {
    return dateStr;
  }
}

export default function DoctorSpecialtyPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const [isTokenReady, setIsTokenReady] = useState(false);
  const { mutateAsync: generateToken } = useGenerateToken();

  const specialtySlug = params.specialty || "general";
  const formattedSpecialty = specialtySlug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== "undefined") {
        try { await generateToken(); } catch (e) { console.error("Token error", e); }
        setIsTokenReady(true);
      }
    };
    initAuth();
  }, [generateToken]);

  // Fetch ALL doctors then filter client-side (same token-safe pattern as main doctors page)
  const { data: apiResponse, isLoading: isLoadingDoctors, isError } = useDoctors(
    { page: 1, size: 50 },
    { enabled: isTokenReady }
  );

  const isLoading = !isTokenReady || isLoadingDoctors;

  const rawList = apiResponse?.data?.list || [];
  const doctorsList = rawList
    .filter((doc) => {
      const spec = (doc.speciality || "").toLowerCase();
      return spec === formattedSpecialty.toLowerCase();
    })
    .map((doc) => ({
      id: doc._id || doc.id,
      name: `${doc.firstName || ""} ${doc.lastName || ""}`.trim() || "Doctor",
      specialty: doc.speciality || formattedSpecialty,
      qualifications: doc.graduationDetails?.map((g) => g.degreeName).join(", ") || "MBBS",
      experience: doc.educationDetails?.experienceYear || "0",
      consultationCount: doc.noOfConsultationsDone || 0,
      languages: (doc.language || []).join(", ") || "English",
      price: doc.onlineFees || 599,
      nextAvailable: doc.nextAvailableAt || null,
      profileUrl: doc.profileUrl || doc.profileImage || null,
    }));

  return (
    <div className="doctors-page">
      {/* Header */}
      <div className="page-header">
        <Link href="/consultancy" className="btn-back-doctors">
          {Icons.back}
        </Link>
        <h1 className="page-title">
          <span className="title-icon">{Icons.heart}</span>
          {formattedSpecialty} Doctors
        </h1>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="filter-select">
          <option>Relevance</option>
          <option>Experience: High to Low</option>
          <option>Price: Low to High</option>
        </select>
        <button className="btn-filter">{Icons.filter} Filter</button>
        <select className="filter-select" style={{ minWidth: "220px" }}>
          <option>Available within 1 hour</option>
          <option>Available today</option>
          <option>Available tomorrow</option>
        </select>
      </div>

      {/* Results count */}
      {!isLoading && !isError && (
        <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 16px" }}>
          {doctorsList.length} doctor{doctorsList.length !== 1 ? "s" : ""} found in {formattedSpecialty}
        </p>
      )}

      {/* Doctor List */}
      {isLoading ? (
        <div className="doctors-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="doctor-card doctor-card--skeleton">
              <div className="dc-header skeleton" style={{ height: 32 }} />
              <div className="dc-body">
                <div className="dc-core-info">
                  <div className="dc-avatar-skeleton skeleton" />
                  <div className="dc-details" style={{ width: "100%" }}>
                    <div className="dc-line skeleton" style={{ width: "50%" }} />
                    <div className="dc-line skeleton" style={{ width: "35%" }} />
                    <div className="dc-line skeleton" style={{ width: "70%" }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#ef4444" }}>
          Failed to load doctors. Please try again.
        </div>
      ) : doctorsList.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
          <p style={{ fontSize: "18px", marginBottom: "8px" }}>
            No {formattedSpecialty} doctors available right now
          </p>
          <p style={{ fontSize: "14px" }}>
            Try browsing all doctors or a different specialty.
          </p>
          <button
            style={{ marginTop: "16px", padding: "10px 24px", background: "#0f3d6e", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
            onClick={() => router.push("/doctors")}
          >
            Browse All Doctors
          </button>
        </div>
      ) : (
        <Stagger className="doctors-list">
          {doctorsList.map((doc) => (
            <StaggerItem key={doc.id} className="doctor-card">
              <div className="dc-header">
                {doc.experience} Years Experience
                {doc.consultationCount > 0 && (
                  <><span className="dc-header-dot"> • </span>{doc.consultationCount} Consultations</>
                )}
              </div>

              <div className="dc-body">
                <div className="dc-core-info">
                  {/* Avatar with real image */}
                  <div className="dc-avatar">
                    {doc.profileUrl ? (
                      <img
                        src={doc.profileUrl}
                        alt={doc.name}
                        className="dc-avatar-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <svg
                      width="48" height="48" viewBox="0 0 24 24" fill="none"
                      stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ display: doc.profileUrl ? "none" : "block" }}
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>

                  <div className="dc-details">
                    <div className="dc-name-row">
                      <h3 className="dc-name">{doc.name}</h3>
                      <span className="dc-price">₹{doc.price}</span>
                    </div>

                    <p className="dc-specialty">{doc.specialty}</p>
                    <p className="dc-qualifications">{doc.qualifications}</p>

                    <div className="dc-icon-row">
                      {Icons.language} {doc.languages}
                    </div>

                    <div className="dc-icon-row dc-availability">
                      {Icons.clock} Next available: <span>{formatAvailability(doc.nextAvailable)}</span>
                    </div>

                    {/* Routes to the full slot-booking doctor detail page */}
                    <button
                      className="btn-select"
                      onClick={() => router.push(`/doctors/${doc.id}`)}
                    >
                      Select &amp; Book
                    </button>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
