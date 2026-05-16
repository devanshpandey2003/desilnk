"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./consultancy.css";

/* ─── Service Cards Data ─── */
const SERVICES = [
  {
    id: "talk-doctor",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        <path d="M14.05 2a9 9 0 0 1 8 7.94" opacity="0.5" />
        <path d="M14.05 6A5 5 0 0 1 18 10" opacity="0.5" />
      </svg>
    ),
    title: "Talk to a Doctor Now",
    subtitle: "Instant consultation",
    highlighted: true,
    available: true,
    href: "/doctors",
  },
  {
    id: "book-consult",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Book Consultation",
    subtitle: "Schedule appointment",
    href: "/consultancy/concerns",
  },
  {
    id: "order-meds",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" opacity="0" />
        <path d="M19.5 7c.276 0 .5.224.5.5v9c0 .276-.224.5-.5.5h-15a.5.5 0 0 1-.5-.5v-9c0-.276.224-.5.5-.5h15z" />
        <path d="M12 11v4" />
        <path d="M10 13h4" />
        <circle cx="8.5" cy="7" r="0" />
        <path d="M8 2l4 5 4-5" />
      </svg>
    ),
    title: "Order Medicines",
    subtitle: "Fast delivery",
  },
  {
    id: "lab-tests",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6v4.5l-3 6 3 6H9l3-6-3-6V3z" />
        <line x1="9" y1="3" x2="15" y2="3" />
      </svg>
    ),
    title: "Book Lab Tests",
    subtitle: "Home collection",
  },
  {
    id: "health-records",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: "Health Records",
    subtitle: "Digital storage",
  },
  {
    id: "wellness",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: "Wellness Programs",
    subtitle: "Fitness & nutrition",
  },
  {
    id: "home-collection",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: "Home Collection",
    subtitle: "Sample pickup",
  },
  {
    id: "health-checkups",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Health Checkups",
    subtitle: "Full body scans",
  },
  {
    id: "family-care",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Family Care",
    subtitle: "Manage together",
  },
];

/* ─── Specialties Data ─── */
const SPECIALTIES = [
  { name: "Cardiology", icon: "💓" },
  { name: "Paediatrics", icon: "👶" },
  { name: "Ophthalmology", icon: "👁️" },
  { name: "General Surgery", icon: "🏥" },
  { name: "Gynecology", icon: "👩‍⚕️" },
  { name: "Psychotherapy", icon: "🧠" },
  { name: "Pain Management", icon: "💊" },
  { name: "Orthopaedics", icon: "🦴" },
];

/* ─── Testimonials Data ─── */
const TESTIMONIALS = [
  {
    stars: 5,
    quote:
      "I consulted the app and made for a face-to-face session. The doctors were available when I required them. They were equipped and specialized in the medical field I needed. It's highly commendable!",
    name: "Priya Sharma",
    city: "Mumbai",
    avatar: "P",
  },
  {
    stars: 5,
    quote:
      "Excellent service! Got my prescription within minutes. The doctor was very thorough and professional. Medicine delivery was also super fast.",
    name: "Rahul Verma",
    city: "Delhi",
    avatar: "R",
  },
  {
    stars: 5,
    quote:
      "As an NRI, managing my parents' health was always stressful. MeraDoc makes it so easy — I can book consultations from abroad and track everything digitally.",
    name: "Anita Desai",
    city: "Bangalore",
    avatar: "A",
  },
];

/* ─── Feature Checklist ─── */
const APP_FEATURES = [
  "Instant access to 1000+ verified doctors",
  "Video & chat consultations 24/7",
  "Digital prescriptions & health records",
  "Medicine delivery in 2 hours",
  "Home sample collection for lab tests",
];

/* ─── Icons ─── */
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#16a34a" />
    <polyline points="8 12 11 15 16 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const StarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/* ════════════════════════════════════════════ */
/*                   PAGE                      */
/* ════════════════════════════════════════════ */
export default function ConsultancyHome() {
  const router = useRouter();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  const prevTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(nextTestimonial, 5000);
    return () => clearInterval(timer);
  }, [nextTestimonial]);

  return (
    <main className="consultancy-main">
      {/* ═══════════ SECTION 1 — HERO ═══════════ */}
      <section className="hero-section">
        <div className="hero-left">
          <div className="trust-badge-pill">
            <span className="trust-dot" />
            Trusted by 50,000+ families
          </div>

          <h1 className="hero-headline">
            Your Family&apos;s
            <br />
            Complete Healthcare
            <br />
            Starts Here
          </h1>

          <p className="hero-subtitle">
            Consult doctors, book tests, order medicines, and manage health
            records — everything in one place.
          </p>

          <div className="hero-cta-row">
            <button className="btn-talk-now" onClick={() => router.push("/doctors")}>
              <span className="btn-talk-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span>
                Talk to a Doctor Now
                <small className="btn-talk-sub">
                  <span className="avail-dot" />
                  Available for instant consultation
                </small>
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

          </div>

          <div className="hero-stats-row">
            <div className="hero-stat">
              <span className="stat-number">1000+</span>
              <span className="stat-label">Expert Doctors</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Support</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="stat-number">2 Hours</span>
              <span className="stat-label">Medicine Delivery</span>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="service-cards-grid">
            {SERVICES.map((svc) => (
              <button
                key={svc.id}
                className={`service-card ${svc.highlighted ? "service-card--highlighted" : ""}`}
                onClick={() => svc.href && router.push(svc.href)}
              >
                {svc.available && (
                  <span className="service-available-badge">
                    <span className="avail-dot" /> Available
                  </span>
                )}
                <span className={`service-card-icon ${svc.highlighted ? "icon--white" : ""}`}>
                  {svc.icon}
                </span>
                <span className="service-card-title">{svc.title}</span>
                <span className="service-card-sub">{svc.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ SECTION 2 — SPECIALTIES ═══════════ */}
      <section className="specialties-section">
        <h2 className="section-heading">Browse Doctor by Specialties</h2>
        <p className="section-subheading">
          Find the right specialist for your health needs
        </p>

        <div className="specialties-row">
          {SPECIALTIES.map((spec) => (
            <button
              key={spec.name}
              className="spec-chip"
              onClick={() => router.push(`/doctors?specialty=${encodeURIComponent(spec.name)}`)}
            >
              <span className="spec-chip-icon">{spec.icon}</span>
              <span className="spec-chip-name">{spec.name}</span>
            </button>
          ))}
        </div>

        <div className="care-guide-banner">
          <div className="care-guide-left">
            <span className="care-guide-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81" />
              </svg>
            </span>
            <div>
              <span className="care-guide-q">Don&apos;t know who to consult?</span>
              <strong>Talk to a Care Guide</strong>
            </div>
          </div>
          <button className="btn-get-help">Get Help Now</button>
        </div>
      </section>

      {/* ═══════════ SECTION 3 — TESTIMONIALS ═══════════ */}
      <section className="testimonials-section">
        <h2 className="testimonials-heading">What our patients say</h2>
        <p className="section-subheading">
          Real experiences from families across India
        </p>

        <div className="testimonial-carousel">
          <div
            className="testimonial-track"
            style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
          >
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="testimonial-card">
                <div className="testimonial-stars">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <StarIcon key={i} />
                  ))}
                </div>
                <blockquote className="testimonial-quote">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.avatar}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.city}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="carousel-controls">
          <button className="carousel-arrow" onClick={prevTestimonial} aria-label="Previous testimonial">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="carousel-dots">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                className={`carousel-dot ${i === currentTestimonial ? "active" : ""}`}
                onClick={() => setCurrentTestimonial(i)}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
          <button className="carousel-arrow" onClick={nextTestimonial} aria-label="Next testimonial">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      {/* ═══════════ SECTION 4 — APP DOWNLOAD ═══════════ */}
      <section className="app-section" style={{ display: "none" }}>
        <div className="app-left">
          <h2 className="app-heading">
            Get personalized healthcare
            <br />
            on the go
          </h2>
          <p className="app-description">
            Download the MeraDoc app and access world-class healthcare from
            anywhere. Book consultations, order medicines, and manage your
            family&apos;s health — all from your phone.
          </p>

          <ul className="app-features-list">
            {APP_FEATURES.map((feat, i) => (
              <li key={i}>
                <CheckIcon />
                {feat}
              </li>
            ))}
          </ul>

          <div className="store-badges">
            <button className="store-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.707l2.108 1.222a1 1 0 0 1 0 1.556l-2.108 1.222L15.3 12.6l2.398-2.6zM5.864 3.465L16.8 9.798l-2.302 2.302-8.635-8.635z" />
              </svg>
              <div>
                <small>GET IT ON</small>
                <span>Google Play</span>
              </div>
            </button>
            <button className="store-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div>
                <small>Download on the</small>
                <span>App Store</span>
              </div>
            </button>
          </div>
        </div>

        <div className="app-right">
          <div className="phone-mockup">
            <div className="phone-screen">
              <div className="phone-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM12 17v-4H8v-2h4V7h2v4h4v2h-4v4h-2z" />
                </svg>
                <div className="phone-search-bar" />
                <div className="phone-cart">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
              </div>
              <div className="phone-talk-banner">
                <span>🩺 Talk to a doctor now</span>
                <small>Get instant consultation</small>
              </div>
              <div className="phone-quick-actions">
                <div className="pqa-item">
                  <span>📅</span>
                  <small>Book an appointment</small>
                </div>
                <div className="pqa-item">
                  <span>💊</span>
                  <small>Medicines delivered</small>
                </div>
                <div className="pqa-item">
                  <span>🧪</span>
                  <small>Lab tests home</small>
                </div>
              </div>
              <div className="phone-specialties-header">
                <strong>Browse by Specialties</strong>
                <span>See all</span>
              </div>
              <div className="phone-specialties">
                <div className="ps-item"><span>💓</span><small>Cardiology</small></div>
                <div className="ps-item"><span>👶</span><small>Paediatrics</small></div>
              </div>
              <div className="phone-cta-bar">
                Don&apos;t know who to consult? Call us 📞
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
