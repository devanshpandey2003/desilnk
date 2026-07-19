"use client";

import Image from "next/image";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

export default function Home() {
  return (
    <>
      {/* ───── Navbar ───── */}
      <nav className="navbar">
        <a href="/" className="navbar-logo">
          <Image src="/Logo.jpg" alt="Desi Link" width={140} height={36} />
        </a>

        <ul className="navbar-links">
          <li><a href="#features">What&apos;s coming</a></li>
          <li><a href="#cta">Get updates</a></li>
          <li><a href="#" className="demo-link">Demo</a></li>
        </ul>

        <div className="navbar-right">
          <button className="btn-coming-soon">Coming soon</button>
          <a href="/login" className="btn-login">Login</a>
        </div>
      </nav>

      {/* ───── Hero ───── */}
      <section className="hero">
        <div className="hero-content">
          <h1>A smarter way to manage life back home.</h1>
          <p className="hero-subtitle">
            Desi Link brings finances, property and family support into one secure place
            —built for NRIs.
          </p>
          <div className="hero-buttons">
            <a href="#cta" className="btn-primary">
              Get early access
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <a href="#features" className="btn-secondary">
              See what&apos;s coming
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </a>
          </div>
        </div>

        <div className="dashboard-mockup">
          <div className="dashboard-card card-back" />
          <div className="dashboard-card card-mid" />
          <div className="dashboard-card card-front">
            <span>Your dashboard</span>
          </div>
        </div>
      </section>

      <div className="gradient-strip" />

      {/* ───── What's Coming ───── */}
      <section id="features" className="features">
        <Reveal>
          <h2>What&apos;s coming</h2>
          <p className="features-subtitle">
            Everything you need to stay connected and in control, from anywhere in the world.
          </p>
        </Reveal>

        <Stagger className="features-grid">
          {/* Card: Money & bills */}
          <StaggerItem className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <h3>Money &amp; bills</h3>
            <p>Track payments, set reminders, and manage recurring bills from anywhere.</p>
          </StaggerItem>

          {/* Card: Property */}
          <StaggerItem className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h3>Property</h3>
            <p>Store documents, log maintenance, and get updates on your assets.</p>
          </StaggerItem>

          {/* Card: Family support */}
          <StaggerItem className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3>Family support</h3>
            <p>Coordinate requests and tasks with family members back home.</p>
          </StaggerItem>

          {/* Card: Trusted services */}
          <StaggerItem className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h3>Trusted services</h3>
            <p>Access curated, vetted service providers you can rely on.</p>
          </StaggerItem>

          {/* Card: Secure sharing */}
          <StaggerItem className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <h3>Secure sharing</h3>
            <p>Control who sees what with granular permission settings.</p>
          </StaggerItem>

          {/* Card: Smart insights */}
          <StaggerItem className="feature-card">
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </div>
            <h3>Smart insights</h3>
            <p>Stay informed with timely notifications and activity timelines.</p>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ───── How It Works ───── */}
      <section className="how-it-works">
        <h2>How it works</h2>
        <p className="how-subtitle">Three simple steps to get started.</p>

        <Stagger className="steps-container">
          <StaggerItem className="step">
            <div className="step-number">1</div>
            <h3>Join the waitlist</h3>
            <p>Sign up with your email to reserve your spot.</p>
          </StaggerItem>
          <StaggerItem className="step">
            <div className="step-number">2</div>
            <h3>Tell us what you need</h3>
            <p>Share your priorities so we can tailor the experience.</p>
          </StaggerItem>
          <StaggerItem className="step">
            <div className="step-number">3</div>
            <h3>Get invited to the beta</h3>
            <p>Be among the first to try Desi Link when we launch.</p>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ───── CTA / Signup ───── */}
      <section id="cta" className="cta-section">
        <Reveal className="cta-content">
          <h2>Be first in line.</h2>
          <p className="cta-subtitle">We&apos;ll only email when there&apos;s something worth sharing.</p>

          <form className="cta-form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              className="cta-input"
              placeholder="Your email address"
              required
            />
            <select className="cta-select" defaultValue="">
              <option value="" disabled>Where are you based? (optional)</option>
              <option value="us">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="ca">Canada</option>
              <option value="au">Australia</option>
              <option value="ae">UAE</option>
              <option value="sg">Singapore</option>
              <option value="other">Other</option>
            </select>
            <button type="submit" className="btn-notify">Notify me</button>
          </form>

          <div className="trust-badges">
            <div className="trust-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Privacy-first
            </div>
            <div className="trust-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Built for NRIs
            </div>
            <div className="trust-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              No spam
            </div>
          </div>
        </Reveal>
      </section>

      {/* ───── Footer ───── */}
      <footer className="footer">
        <div className="footer-left">
          <Image src="/Logo.jpg" alt="Desi Link" width={100} height={28} />
          <span>© 2026 Desi Link. All rights reserved.</span>
        </div>
        <div className="footer-links">
          <a href="#">Contact</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </footer>
    </>
  );
}
