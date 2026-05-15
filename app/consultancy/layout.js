"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./consultancy.css";

export default function ConsultancyLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/consultancy/book-consultation", label: "Consultations" },
    { href: "/consultancy/lab-tests", label: "Lab Tests" },
    { href: "/consultancy/medicines", label: "Medicines" },
    { href: "/consultancy/profile", label: "My Profile" },
    { href: "/consultancy/about", label: "About" },
  ];

  return (
    <div className="consultancy-layout">
      {/* ───── Navbar ───── */}
      <nav className="consultancy-nav">
        <div className="nav-left">
          <Link href="/consultancy" className="nav-logo">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM12 17v-4H8v-2h4V7h2v4h4v2h-4v4h-2z" />
            </svg>
          </Link>
          <div className="nav-links">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname?.startsWith(l.href) ? "active" : ""}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <button className="btn-get-started">Get Started</button>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* ───── Mobile Drawer ───── */}
      {mobileOpen && (
        <div className="mobile-nav-drawer">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`mobile-nav-link${pathname?.startsWith(l.href) ? " active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      {/* Overlay to close drawer */}
      {mobileOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {children}
    </div>
  );
}
