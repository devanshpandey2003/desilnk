import Link from "next/link";
import "../consultancy/consultancy.css";

export default function DoctorsLayout({ children }) {
  return (
    <div className="consultancy-layout">
      <nav className="consultancy-nav">
        <div className="nav-left">
          <Link href="/dashboard" className="nav-logo">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM12 17v-4H8v-2h4V7h2v4h4v2h-4v4h-2z" />
            </svg>
          </Link>
          <div className="nav-links">
            <Link href="/consultancy/book-consultation" className="active">Consultations</Link>
            <Link href="/consultancy/lab-tests">Lab Tests</Link>
            <Link href="/consultancy/medicines">Medicines</Link>
            <Link href="/consultancy/profile">My Profile</Link>
            <Link href="/consultancy/about">About</Link>
          </div>
        </div>
        <div className="nav-right">
          <button className="btn-get-started">Get Started</button>
        </div>
      </nav>
      {children}
    </div>
  );
}
