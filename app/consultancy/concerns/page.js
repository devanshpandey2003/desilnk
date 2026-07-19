"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConcerns, useGenerateToken } from "../../../hooks/useApi";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import "../book-consultation/concerns.css";
import "./concerns-page.css";

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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#3b82f6">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM12 17v-4H8v-2h4V7h2v4h4v2h-4v4h-2z" />
    </svg>
  ),
  phone: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.19 11.8 19.79 19.79 0 0 1 1.12 3.18 2 2 0 0 1 3.11 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  lightning: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  clock: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  shield: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

/** Concern name → emoji icon */
const CONCERN_ICONS = {
  "general health":             "❤️",
  "sexual health":              "❤️",
  "women's health":             "👩",
  "womens health":              "👩",
  "skin and hair health":       "✨",
  "skin & hair health":         "✨",
  "digestive and liver health": "🟡",
  "digestive & liver health":   "🟡",
  "heart health":               "❤️",
  "blood sugar health":         "🩸",
  "bone and joint health":      "🔩",
  "bone & joint health":        "🔩",
  "mental wellness":            "🧠",
  "ear-nose-throat health":     "👃",
  "ent health":                 "👃",
  "child care":                 "👶",
  "pain management":            "💊",
  "breathing and lung health":  "🫁",
  "breathing & lung health":    "🫁",
  "weight management":          "⚖️",
  "kidney care":                "🫘",
  "eye care":                   "👁️",
  "piles and surgery opinion":  "🔬",
  "piles & surgery opinion":    "🔬",
  "dental health":              "🦷",
  "elder care":                 "👴",
  "diabetes":                   "🩸",
};

function getConcernIcon(name) {
  if (!name) return "🩺";
  return CONCERN_ICONS[name.toLowerCase().trim()] || "🩺";
}

/** Symptom color palette — cycles through blues/pinks */
const SYMPTOM_COLORS = [
  "#3b82f6", // blue
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#10b981", // green
];

export default function ConcernsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isTokenReady, setIsTokenReady] = useState(false);
  const { mutateAsync: generateToken } = useGenerateToken();

  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined") {
        try { await generateToken(); } catch (e) { console.error(e); }
        setIsTokenReady(true);
      }
    };
    init();
  }, [generateToken]);

  const { data: apiResponse, isLoading } = useConcerns({}, { enabled: isTokenReady });

  const concerns = useMemo(() => {
    const raw = Array.isArray(apiResponse?.data)
      ? apiResponse.data
      : apiResponse?.data?.list || apiResponse?.list || [];
    return raw.map((c) => ({
      id: c._id || c.id,
      name: c.categoryName || c.name || "Health Concern",
      symptoms: c.symptoms || [],
      specialityId: c.specialityId || null,
      specialityName: c.specialityName || null,
      icon: getConcernIcon(c.categoryName || c.name || ""),
    }));
  }, [apiResponse]);

  const filtered = useMemo(() => {
    if (!search.trim()) return concerns;
    const q = search.toLowerCase();
    return concerns.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.symptoms.some((s) => s.toLowerCase().includes(q))
    );
  }, [concerns, search]);

  const handleConcernClick = (concern) => {
    // Navigate to doctors filtered by speciality if available, else by concern name
    if (concern.specialityName) {
      router.push(`/doctors?specialty=${encodeURIComponent(concern.specialityName)}`);
    } else {
      router.push(`/doctors?concern=${encodeURIComponent(concern.name)}`);
    }
  };

  return (
    <div className="concerns-page concerns-page--health">
      {/* Header */}
      <div className="concerns-header">
        <Link href="/consultancy" className="concerns-back-btn">{Icons.back}</Link>
        <span className="concerns-header-icon">{Icons.medCross}</span>
        <h1>Find doctors for your health concern</h1>
      </div>

      {/* Search */}
      <div className="concerns-search">
        <span className="concerns-search-icon">{Icons.search}</span>
        <input
          type="text"
          placeholder="Search concern, symptoms"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Talk Banner removed */}

      {/* Section Title */}
      <p className="concerns-section-title">FIND DOCTORS FOR YOUR HEALTH CONCERN</p>

      {/* Concerns Grid */}
      {isLoading ? (
        <div className="concerns-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="concern-card concern-card--skeleton">
              <div className="skeleton-icon skeleton" />
              <div className="skeleton-lines">
                <div className="skeleton-line skeleton-line--title skeleton" />
                <div className="skeleton-line skeleton-line--subtitle skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="concerns-empty">No health concerns found.</p>
      ) : (
        <Stagger className="concerns-grid">
          {filtered.map((concern) => (
            <StaggerItem key={concern.id}>
              <button
                className="concern-card concern-card--health"
                onClick={() => handleConcernClick(concern)}
              >
                <span className="concern-card-icon">{concern.icon}</span>
                <div className="concern-card-text">
                  <strong>{concern.name}</strong>
                  {concern.symptoms.length > 0 && (
                    <span>{concern.symptoms.join(", ")}</span>
                  )}
                </div>
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Call to Book */}
      <button className="concerns-call-btn">
        Call to book an appointment – 1800 3090 101
      </button>

      {/* Why Choose Us */}
      <Reveal>
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
      </Reveal>
    </div>
  );
}
