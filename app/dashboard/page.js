"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserService } from "../../services/user.service";
import { getPatientId } from "../../lib/getPatientId";
import "./dashboard.css";

// SVG Icons
const Icons = {
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  services: (
    <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  bell: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
  ),
  medical: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/></svg>
  ),
  finance: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
  ),
  property: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  menu: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
  ),
  external: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
  )
};

export default function Dashboard() {
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) {
      router.replace("/login");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name") || localStorage.getItem("userName") || "";
    if (name) setUserName(name);
  }, [router]);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const [meradocLoading, setMeradocLoading] = useState(false);

  const handleMeraDocEntry = async () => {
    setMeradocLoading(true);
    try {
      await UserService.generateToken();
      const patientId = await getPatientId();
      if (!patientId) {
        router.push("/meradoc-register");
        return;
      }
      router.push("/consultancy");
    } catch (err) {
      console.error("MeraDoc entry failed:", err);
      router.push("/consultancy");
    } finally {
      setMeradocLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* ───── Sidebar ───── */}
      <aside className={`dashboard-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <Link href="/">
            <Image src="/Logo.jpg" alt="Desi Link" width={120} height={30} priority />
          </Link>
          <div className="sidebar-logo-divider" />
          <Image src="/sib-logo.svg" alt="South Indian Bank" width={100} height={36} priority style={{ objectFit: "contain" }} />
        </div>

        <nav className="sidebar-nav">
          <Link href="/dashboard" className="nav-item active" onClick={() => setSidebarOpen(false)}>
            {Icons.home}
            Dashboard
          </Link>

          <p className="sidebar-section-label">Account</p>

          <Link href="/consultancy/profile" className="nav-item" onClick={() => setSidebarOpen(false)}>
            {Icons.settings}
            My Profile
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <h4>{userName}</h4>
              <p>NRI Account</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ───── Main Content ───── */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            {Icons.menu}
          </button>
          <div className="header-title">
            <h1>Overview</h1>
          </div>
          <div className="header-actions">
            <button className="btn-action" aria-label="Notifications">
              {Icons.bell}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="dashboard-content">
          {/* Welcome Banner */}
          <section className="welcome-banner animate-fade-in">
            <h2>Welcome back, {userName}!</h2>
            <p>Here&apos;s a quick overview of your active services and what&apos;s coming next to make managing life back home easier.</p>
          </section>

          {/* Services Section */}
          <section className="services-section animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="section-header">
              <h3>Our Services</h3>
            </div>

            <div className="services-grid">
              
              {/* Card 1: Doctor Consultancy (Active) */}
              <div className="service-card">
                <div className="service-card-header">
                  <div className="service-icon-box">
                    {Icons.medical}
                  </div>
                  <span className="status-badge active">Active</span>
                </div>
                <h4>Doctor Consultancy</h4>
                <p>Connect with top medical professionals back home for trusted consultations and second opinions.</p>
                <div className="service-card-action">
                  <button
                    className="btn-service primary"
                    onClick={handleMeraDocEntry}
                    disabled={meradocLoading}
                  >
                    {meradocLoading ? "Loading..." : "Find a Doctor"}
                    {!meradocLoading && Icons.external}
                  </button>
                </div>
              </div>

              {/* Card 2: Finance Services (Coming Soon) */}
              <div className="service-card coming-soon">
                <div className="service-card-header">
                  <div className="service-icon-box">
                    {Icons.finance}
                  </div>
                  <span className="status-badge soon">Coming Soon</span>
                </div>
                <h4>Finance Services</h4>
                <p>Manage remittances, accounts, and investments securely across borders.</p>
                <div className="service-card-action">
                  <button className="btn-service disabled" disabled title="Launching soon">
                    Launching soon
                  </button>
                </div>
              </div>

              {/* Card 3: Property Management (Coming Soon) */}
              <div className="service-card coming-soon">
                <div className="service-card-header">
                  <div className="service-icon-box">
                    {Icons.property}
                  </div>
                  <span className="status-badge soon">Coming Soon</span>
                </div>
                <h4>Property Management</h4>
                <p>Store property documents, monitor maintenance, and manage your real estate assets safely.</p>
                <div className="service-card-action">
                  <button className="btn-service disabled" disabled title="Launching soon">
                    Launching soon
                  </button>
                </div>
              </div>

            </div>
          </section>
        </div>
      </main>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="mobile-overlay" 
          onClick={toggleSidebar}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 90
          }}
        />
      )}
    </div>
  );
}
