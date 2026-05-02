"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSpecialities, useGenerateToken } from "../../../hooks/useApi";
import "./concerns.css";

/* ─── Specialty → icon mapping ─── */
const SPECIALTY_ICONS = {
  "cardiology":         "💓",
  "paediatrics":        "👶",
  "pediatrics":         "👶",
  "ophthalmology":      "👁️",
  "general surgery":    "🏥",
  "gynecology":         "👩‍⚕️",
  "gynaecology":        "👩‍⚕️",
  "psychotherapy":      "🧠",
  "psychiatry":         "🧠",
  "pain management":    "💊",
  "orthopaedics":       "🦴",
  "orthopedics":        "🦴",
  "medical oncology":   "🔬",
  "oncology":           "🔬",
  "pulmonology":        "🫁",
  "urology":            "💧",
  "sexology":           "💜",
  "urology, sexology":  "💧",
  "ent":                "👂",
  "neurology":          "🧠",
  "dental care":        "🦷",
  "dentistry":          "🦷",
  "diet":               "🥗",
  "nutrition":          "🥗",
  "dermatology":        "✨",
  "dermatalogy":        "✨",
  "internal medicine":  "🩺",
  "family medicine":    "👨‍👩‍👧",
  "general physician":  "💓",
  "diabetology":        "🩸",
  "diabetes":           "🩸",
  "skin":               "✨",
  "hair":               "✨",
  "mental health":      "🧠",
  "kidney":             "💧",
  "liver":              "🫁",
  "blood":              "🩸",
  "default":            "🩺",
};

function getSpecialtyIcon(name = "") {
  const lower = name.toLowerCase().trim();
  if (SPECIALTY_ICONS[lower]) return SPECIALTY_ICONS[lower];
  // partial match
  for (const [key, icon] of Object.entries(SPECIALTY_ICONS)) {
    if (key !== "default" && lower.includes(key)) return icon;
  }
  return SPECIALTY_ICONS.default;
}

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
  medCross: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM12 17v-4H8v-2h4V7h2v4h4v2h-4v4h-2z" />
    </svg>
  ),
  lightning: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  clock: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  shield: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f3d6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

export default function SpecialitiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isTokenReady, setIsTokenReady] = useState(false);
  const { mutateAsync: generateToken } = useGenerateToken();

  // Generate token first
  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined") {
        try { await generateToken(); } catch (e) { console.error("Token error", e); }
        setIsTokenReady(true);
      }
    };
    init();
  }, [generateToken]);

  // Call getSpecialities API
  const { data: apiResponse, isLoading } = useSpecialities({}, { enabled: isTokenReady });

  // Parse specialities from API response
  // API returns: { data: [ { _id, specialtyName, icon } ] }
  const specialities = useMemo(() => {
    const raw = Array.isArray(apiResponse?.data)
      ? apiResponse.data
      : apiResponse?.data?.list || [];
    return raw.map((s) => ({
      id: s._id || s.id,
      name: s.specialtyName || s.specialityName || s.name || "Specialty",
      iconUrl: s.icon || null,
      emoji: getSpecialtyIcon(s.specialtyName || s.specialityName || s.name || ""),
    }));
  }, [apiResponse]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return specialities;
    const q = search.toLowerCase();
    return specialities.filter((s) => s.name.toLowerCase().includes(q));
  }, [specialities, search]);

  const handleSpecialtyClick = (spec) => {
    // Navigate to doctors page filtered by this specialty name
    router.push(`/doctors?specialty=${encodeURIComponent(spec.name)}`);
  };

  return (
    <div className="concerns-page">
      {/* Header */}
      <div className="concerns-header">
        <Link href="/consultancy" className="concerns-back-btn">
          {Icons.back}
        </Link>
        <span className="concerns-header-icon">{Icons.medCross}</span>
        <h1>Find doctors by specialty</h1>
      </div>

      {/* Search */}
      <div className="concerns-search">
        <span className="concerns-search-icon">{Icons.search}</span>
        <input
          type="text"
          placeholder="Search specialty, symptoms"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Talk to Doctor Banner */}
      <div className="concerns-talk-banner" onClick={() => router.push("/doctors")} style={{ cursor: "pointer" }}>
        <div className="ctb-left">
          <span className="ctb-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81" />
              <path d="M14.05 2a9 9 0 0 1 8 7.94" opacity="0.6" />
              <path d="M14.05 6A5 5 0 0 1 18 10" opacity="0.6" />
            </svg>
          </span>
          <div>
            <strong>Talk to a doctor now</strong>
            <span>Get instant consultation</span>
          </div>
        </div>
        <span className="ctb-lightning">{Icons.lightning}</span>
      </div>

      {/* Section Title */}
      <h2 className="concerns-section-title">FIND DOCTORS FOR YOUR HEALTH CONCERN</h2>

      {/* Specialities Grid */}
      <div className="concerns-grid">
        {isLoading ? (
          <>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="concern-card concern-card--skeleton">
                <div className="skeleton-icon" />
                <div className="skeleton-lines">
                  <div className="skeleton-line skeleton-line--title" />
                  <div className="skeleton-line skeleton-line--subtitle" />
                </div>
              </div>
            ))}
          </>
        ) : filtered.length === 0 ? (
          <div className="concerns-empty">
            <p>No specialties found{search ? ` for "${search}"` : ""}.</p>
          </div>
        ) : (
          filtered.map((spec) => (
            <button
              key={spec.id}
              className="concern-card"
              onClick={() => handleSpecialtyClick(spec)}
            >
              <span className="concern-card-icon">{spec.emoji}</span>
              <div className="concern-card-text">
                <strong>{spec.name}</strong>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Call to Book */}
      <button className="concerns-call-btn">
        Call to book an appointment – 1800 3090 101
      </button>

      {/* Why Choose Us */}
      <section className="concerns-why-us">
        <h2>Why choose us?</h2>
        <p className="why-us-sub">
          Experience healthcare the way it should be - accessible, reliable, and professional
        </p>

        <div className="why-us-grid">
          <div className="why-us-card">
            <div className="why-us-icon-circle">{Icons.clock}</div>
            <div className="why-us-content">
              <h3>24×7 availability of doctors</h3>
              <p>
                Our doctors are available round the clock to provide you with
                immediate medical consultation. Whether it&apos;s day or night,
                weekday or weekend, expert medical help is just a click away. No
                more waiting for appointments or rushing to clinics.
              </p>
              <ul>
                <li>{Icons.check} Instant consultation anytime</li>
                <li>{Icons.check} Quick response in emergencies</li>
                <li>{Icons.check} No waiting time or long queues</li>
              </ul>
            </div>
          </div>

          <div className="why-us-card">
            <div className="why-us-icon-circle">{Icons.shield}</div>
            <div className="why-us-content">
              <h3>Trusted network of qualified doctors verified by us</h3>
              <p>
                Every doctor in our network is thoroughly verified and certified
                by us. We ensure that you receive care from licensed
                professionals with proven expertise. Your health and safety are
                our top priorities.
              </p>
              <ul>
                <li>{Icons.check} 100% verified medical credentials</li>
                <li>{Icons.check} Experienced specialists across fields</li>
                <li>{Icons.check} Regular quality assessments</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
