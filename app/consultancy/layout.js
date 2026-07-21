"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import "./consultancy.css";

export default function ConsultancyLayout({ children }) {
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [cartCount,     setCartCount]     = useState(0);
  const [deliveryCity,  setDeliveryCity]  = useState("");
  const pathname = usePathname();


  // Derive cart count directly from ltCart array so it survives navigation
  useEffect(() => {
    const sync = () => {
      try { const c = JSON.parse(localStorage.getItem("ltCart") || "[]"); setCartCount(c.length); } catch { setCartCount(0); }
      // Derive the delivery city from the ACTIVE user's saved location so it can
      // never leak from a previously logged-in user (no global ltDeliveryCity key).
      try {
        const email = localStorage.getItem("userEmail") || "";
        const loc = email ? JSON.parse(localStorage.getItem(`ltLocation_${email}`) || "null") : null;
        setDeliveryCity(loc?.city || "");
      } catch { setDeliveryCity(""); }
    };
    sync();
    window.addEventListener("lt-nav-update", sync);
    window.addEventListener("storage",       sync); // sync across tabs
    return () => {
      window.removeEventListener("lt-nav-update", sync);
      window.removeEventListener("storage",       sync);
    };
  }, []);

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
            <Image src="/meradoc-logo.svg" alt="MeraDoc" width={36} height={36} priority style={{ borderRadius: 8, objectFit: "contain" }} />
            <span className="nav-logo-text">MeraDoc</span>
          </Link>
          <div className="nav-links">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={pathname === l.href ? "active" : ""}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="nav-right">
          {/* Delivery address pill */}
          <Link
            href="/consultancy/lab-tests/address?from=nav"
            className="nav-address-pill"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>
              <span className="nav-address-label">Deliver to</span>
              <strong>{deliveryCity || "Set address"}</strong>
            </span>
          </Link>

          {/* Cart icon */}
          <Link href="/consultancy/cart" className="nav-cart-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
          </Link>

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
              className={`mobile-nav-link${pathname === l.href ? " active" : ""}`}
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
