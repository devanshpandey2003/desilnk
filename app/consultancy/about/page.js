"use client";

import Link from "next/link";

export default function AboutPage() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 24px", minHeight: "calc(100vh - 72px)" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "24px", color: "#1e293b" }}>About Our Medical Network</h1>
      <p style={{ fontSize: "1.1rem", color: "#475569", lineHeight: "1.7", marginBottom: "24px" }}>
        We believe healthcare should be accessible to everyone, no matter where they are. Our native medical 
        consultancy platform was designed specifically with NRIs in mind. By partnering with the most trusted 
        medical professionals back home, we ensure that your loved ones receive the highest quality of care.
      </p>
      <p style={{ fontSize: "1.1rem", color: "#475569", lineHeight: "1.7", marginBottom: "40px" }}>
        Every doctor, clinic, and lab testing facility operating on our platform undergoes a rigorous 
        verification process to ensure credentials, experience, and patient satisfaction meet our exacting standards.
      </p>

      <div style={{ background: "white", padding: "32px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
        <h3 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "16px", color: "#1e293b" }}>Our Mission</h3>
        <p style={{ color: "#64748b", lineHeight: "1.6" }}>
          To provide seamless, borderless healthcare access connecting families back home with top-tier 
          medical practitioners for instant consultations, reliable medicine delivery, and trusted lab testing.
        </p>
      </div>

      <div style={{ marginTop: "40px" }}>
        <Link href="/consultancy" style={{ display: "inline-block", background: "#115ea3", color: "white", padding: "12px 24px", borderRadius: "8px", fontWeight: "600", textDecoration: "none" }}>
          Back to Consultations
        </Link>
      </div>
    </div>
  );
}
