"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDoctors, useGenerateToken } from "../../hooks/useApi";
import "./doctors.css";

/* ─── Icons ─── */
const Icons = {
  back: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  language: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  clock: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  medCross: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#3b82f6">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM12 17v-4H8v-2h4V7h2v4h4v2h-4v4h-2z" />
    </svg>
  ),
  briefcase: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  stethoscope: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.62L3 5H1v2h2.6l2-3h6.8l2 3H17V5h-2l-1.8-2.38A2 2 0 0 0 11.5 2h-5a2 2 0 0 0-1.7.62z" />
      <path d="M2 7v6a8 8 0 0 0 16 0V7" /><circle cx="21" cy="15" r="2" /><path d="M19 15v4a4 4 0 0 1-4 4h-2" />
    </svg>
  ),
};

/** Specialty icons */
const SPECIALTY_ICONS = {
  "Cardiology": "❤️",
  "General Physician": "🩺",
  "Paediatrics": "👶",
  "Ophthalmology": "👁️",
  "Gynecology": "👩‍⚕️",
  "Orthopaedics": "🦴",
  "Dermatology": "✨",
  "Psychiatry": "🧠",
  "ENT": "👂",
  "General Surgery": "🏥",
  "default": "🩺",
};

function getSpecialtyIcon(name) {
  return SPECIALTY_ICONS[name] || SPECIALTY_ICONS.default;
}

/** Convert specialty name → specialist title */
const SPECIALIST_TITLES = {
  "cardiology":         "Cardiologist",
  "neurology":          "Neurologist",
  "ophthalmology":      "Ophthalmologist",
  "dermatology":        "Dermatologist",
  "dermatalogy":        "Dermatologist",
  "gynecology":         "Gynecologist",
  "gynaecology":        "Gynaecologist",
  "pulmonology":        "Pulmonologist",
  "urology":            "Urologist",
  "diabetology":        "Diabetologist",
  "radiology":          "Radiologist",
  "oncology":           "Oncologist",
  "medical oncology":   "Oncologist",
  "paediatrics":        "Paediatrician",
  "pediatrics":         "Pediatrician",
  "orthopaedics":       "Orthopaedic Surgeon",
  "orthopedics":        "Orthopedic Surgeon",
  "general surgery":    "General Surgeon",
  "neurosurgery":       "Neurosurgeon",
  "dental care":        "Dentist",
  "dentistry":          "Dentist",
  "ent":                "ENT Specialist",
  "diet":               "Dietitian",
  "nutrition":          "Nutritionist",
  "psychotherapy":      "Psychotherapist",
  "psychiatry":         "Psychiatrist",
  "pain management":    "Pain Specialist",
  "general physician":  "General Physician",
  "family medicine":    "Family Medicine Doctor",
  "internal medicine":  "Internal Medicine Doctor",
  "sexology":           "Sexologist",
};

function getSpecialistTitle(name) {
  if (!name) return "All Doctors";
  const lower = name.toLowerCase().trim();
  if (SPECIALIST_TITLES[lower]) return SPECIALIST_TITLES[lower];
  // Auto-convert *ology → *ologist
  if (lower.endsWith("ology")) return name.slice(0, -5) + "ologist";
  return name;
}

/** Format nextAvailableAt */
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

function DoctorsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSpecialty = searchParams.get("specialty") || "";

  const [isTokenReady, setIsTokenReady] = useState(false);
  const [selectedSpeciality, setSelectedSpeciality] = useState(initialSpecialty);
  const [selectedSpecialityId, setSelectedSpecialityId] = useState("");
  const [search, setSearch] = useState("");
  const { mutateAsync: generateToken } = useGenerateToken();

  // Always generate a fresh token (same as Postman flow)
  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined") {
        try {
          await generateToken();
          console.log("[Doctors] Fresh token generated");
        } catch (e) {
          console.error("[Doctors] Token error", e);
        }
        setIsTokenReady(true);
      }
    };
    init();
  }, [generateToken]);

  // Fetch ALL doctors (single API call — filtering is client-side)
  const { data: apiResponse, isLoading: isLoadingDoctors, isError } = useDoctors(
    { page: 1, size: 50 },
    { enabled: isTokenReady }
  );

  const isLoading = !isTokenReady || isLoadingDoctors;

  // Parse doctor list — store FULL data.list, no slice or limit
  const rawDoctors = useMemo(() => {
    const list = apiResponse?.data?.list || [];
    console.log("Doctors count:", list.length);
    return list;
  }, [apiResponse]);

  // Extract unique specialities (with IDs) from the doctor list
  const uniqueSpecialities = useMemo(() => {
    const map = new Map();
    rawDoctors.forEach((doc) => {
      if (doc.speciality && doc.specialityId && !map.has(doc.specialityId)) {
        map.set(doc.specialityId, doc.speciality);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawDoctors]);

  // Client-side filtering: specialty + search
  const filteredDoctors = useMemo(() => {
    let list = [...rawDoctors];

    // Filter by specialty
    if (selectedSpeciality) {
      list = list.filter((doc) => doc.speciality === selectedSpeciality);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((doc) => {
        const fullName = `${doc.firstName || ""} ${doc.lastName || ""}`.toLowerCase();
        const spec = (doc.speciality || "").toLowerCase();
        const langs = (doc.language || []).join(", ").toLowerCase();
        return fullName.includes(q) || spec.includes(q) || langs.includes(q);
      });
    }

    return list;
  }, [rawDoctors, selectedSpeciality, search]);

  // Handle specialty tag click — uses specialityId for filtering
  const handleSpecialtyClick = (specId, specName) => {
    if (selectedSpecialityId === specId) {
      setSelectedSpeciality("");
      setSelectedSpecialityId("");
    } else {
      setSelectedSpeciality(specName);
      setSelectedSpecialityId(specId);
    }
  };

  return (
    <div className="drp-page">
      {/* Header */}
      <div className="drp-header">
        <Link href="/consultancy/book-consultation" className="drp-back">{Icons.back}</Link>
        <span className="drp-header-icon">{Icons.medCross}</span>
        <h1>{getSpecialistTitle(selectedSpeciality)}</h1>
      </div>

      {/* Search Bar */}
      <div className="drp-search">
        <span className="drp-search-icon">{Icons.search}</span>
        <input
          type="text"
          placeholder="Search by doctor name, specialty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Results Count */}
      {!isLoading && (
        <p className="drp-results-count">
          {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? "s" : ""} found
          {selectedSpeciality ? ` in ${selectedSpeciality}` : ""}
        </p>
      )}

      {/* Doctor Cards */}
      <div className="drp-list">
        {isLoading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="drp-card drp-card--skeleton">
                <div className="skeleton-row">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-info">
                    <div className="skeleton-line w60" />
                    <div className="skeleton-line w40" />
                    <div className="skeleton-line w80" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : isError ? (
          <div className="drp-empty">
            <p>Failed to load doctors. Please try again.</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="drp-empty">
            <p>No doctors found{selectedSpeciality ? ` for "${selectedSpeciality}"` : ""}.</p>
            <p>Try a different specialty or search term.</p>
          </div>
        ) : (
          filteredDoctors.map((doc) => {
            const fullName = `${doc.firstName || ""} ${doc.lastName || ""}`.trim();
            const experience = doc.educationDetails?.experienceYear || "0";
            const languages = (doc.language || []).join(", ");
            const consultations = doc.noOfConsultationsDone || 0;

            return (
              <div key={doc._id} className="drp-card">
                {/* Badge */}
                <div className="drp-card-badge">
                  {Icons.briefcase} {experience} Years Experience
                  {consultations > 0 && (
                    <> <span className="drp-badge-dot">•</span> {consultations} Consultations</>
                  )}
                </div>

                {/* Body */}
                <div className="drp-card-body">
                  {/* Profile Image */}
                  <div className="drp-card-avatar">
                    {doc.profileUrl ? (
                      <img
                        src={doc.profileUrl}
                        alt={fullName}
                        className="drp-avatar-img"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="drp-avatar-fallback"
                      style={{ display: doc.profileUrl ? "none" : "flex" }}
                    >
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="drp-card-info">
                    <div className="drp-card-name-row">
                      <h3>{fullName || "Doctor"}</h3>
                      <span className="drp-card-price">₹{doc.onlineFees || 0}</span>
                    </div>

                    <p className="drp-card-specialty">{doc.speciality || "General"}</p>

                    <p className="drp-card-quals">
                      {doc.graduationDetails?.map((g) => g.degreeName).join(", ") || "MBBS"}
                    </p>

                    <div className="drp-card-meta">
                      {Icons.language} <span>{languages || "English"}</span>
                    </div>

                    <div className="drp-card-meta drp-card-avail">
                      {Icons.clock} <span>Next available: {formatAvailability(doc.nextAvailableAt)}</span>
                    </div>

                    {/* Select Button */}
                    <button
                      className="drp-btn-select"
                      onClick={() => router.push(`/doctors/${doc._id}`)}
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Loading...</div>}>
      <DoctorsPageContent />
    </Suspense>
  );
}
