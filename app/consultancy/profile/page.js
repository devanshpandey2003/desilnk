"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserAPI } from "../../../lib/api";
import { AppointmentService } from "../../../services/appointment.service";
import "./profile.css";

// Icons
const Icons = {
  user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  calendar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  records: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  pill: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 6l6 6-10 10-6-6 10-10z"></path><line x1="10" y1="10" x2="14" y2="14"></line></svg>,
  map: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
  logout: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  xCircle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
  checkCircle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="9 12 11 14 15 10"></polyline></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
};

const STATUS_COLORS = {
  PENDING:   { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  CONFIRMED: { bg: "#dbeafe", color: "#1e40af", label: "Confirmed" },
  ONGOING:   { bg: "#d1fae5", color: "#065f46", label: "Ongoing" },
  COMPLETED: { bg: "#f3f4f6", color: "#374151", label: "Completed" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
};

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

// ─── My Appointments Panel ────────────────────────────────────────────────────
function MyAppointmentsPanel() {
  const [appointment, setAppointment] = useState(null);
  const [aptLoading, setAptLoading] = useState(true);
  const [aptError, setAptError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchAppointment = useCallback(async () => {
    setAptLoading(true);
    setAptError("");
    try {
      const email = localStorage.getItem("userEmail") || "";
      const appointmentKey = email ? `meradocAppointmentId_${email}` : null;
      const appointmentId = appointmentKey ? localStorage.getItem(appointmentKey) : null;

      if (!appointmentId) {
        setAppointment(null);
        setAptLoading(false);
        return;
      }

      const response = await AppointmentService.getAppointmentDetails(appointmentId);
      setAppointment(response?.data || null);
    } catch (err) {
      console.error("Failed to fetch appointment:", err);
      setAptError("Could not load appointment details. Please try again.");
    } finally {
      setAptLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const handleCancel = async () => {
    if (!appointment?._id) return;
    setCancelling(true);
    try {
      await AppointmentService.cancelConsultation(appointment._id);

      // Clear the stored appointment ID so user can book a new one
      const email = localStorage.getItem("userEmail") || "";
      if (email) {
        localStorage.removeItem(`meradocAppointmentId_${email}`);
      }

      setCancelSuccess(true);
      setShowConfirm(false);
      setAppointment((prev) => ({ ...prev, appointmentStatus: "CANCELLED" }));
    } catch (err) {
      console.error("Cancel failed:", err);
      setAptError("Failed to cancel the appointment. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (aptLoading) {
    return (
      <div className="apt-panel-loading">
        <div className="apt-spinner-sm" />
        <p>Loading appointment...</p>
      </div>
    );
  }

  if (aptError) {
    return (
      <div className="apt-panel-error">
        <p>{aptError}</p>
        <button className="btn-retry" onClick={fetchAppointment}>{Icons.refresh} Retry</button>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="apt-panel-empty">
        <div className="apt-empty-icon">{Icons.calendar}</div>
        <h3>No Active Appointment</h3>
        <p>You don&apos;t have any booked appointment at the moment.</p>
        <Link href="/consultancy" className="btn-book-new">Find a Doctor</Link>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[appointment.appointmentStatus] || STATUS_COLORS.PENDING;
  const isActive = !["CANCELLED", "COMPLETED"].includes(appointment.appointmentStatus);
  const doctor = appointment.doctorDetails;

  return (
    <div className="apt-panel">
      {cancelSuccess && (
        <div className="apt-success-banner">
          {Icons.checkCircle}
          <span>Appointment cancelled successfully. You can now book a new one.</span>
          <Link href="/consultancy" className="btn-book-new-inline">Book New</Link>
        </div>
      )}

      <div className="apt-card-profile">
        {/* Status Row */}
        <div className="apt-card-top">
          <div>
            <p className="apt-meta-label">Appointment ID</p>
            <p className="apt-meta-value apt-id-text">{appointment.appointmentId || "—"}</p>
          </div>
          <span
            className="apt-status-pill"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {statusStyle.label}
          </span>
        </div>

        {/* Date / Time / Mode */}
        <div className="apt-details-grid">
          <div>
            <p className="apt-meta-label">Date</p>
            <p className="apt-meta-value">{appointment.appointmentDate || "—"}</p>
          </div>
          <div>
            <p className="apt-meta-label">Time</p>
            <p className="apt-meta-value">
              {formatTime(appointment.appointmentStartTime)} – {formatTime(appointment.appointmentEndTime)}
            </p>
          </div>
          <div>
            <p className="apt-meta-label">Mode</p>
            <p className="apt-meta-value">{appointment.slotType || "—"}</p>
          </div>
        </div>

        {/* Doctor */}
        {doctor && (
          <div className="apt-doctor-strip">
            {doctor.profileUrl ? (
              <img src={doctor.profileUrl} alt={doctor.firstName} className="apt-doc-avatar" />
            ) : (
              <div className="apt-doc-avatar-fallback">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <div>
              <p className="apt-meta-value">Dr. {doctor.firstName} {doctor.lastName}</p>
              <p className="apt-meta-label">{doctor.speciality}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="apt-actions">
          <Link
            href={`/consultancy/appointment/${appointment._id}`}
            className="btn-view-apt"
          >
            View Details
          </Link>

          {isActive && !cancelSuccess && (
            <button
              className="btn-cancel-apt"
              onClick={() => setShowConfirm(true)}
              disabled={cancelling}
            >
              {Icons.xCircle}
              Cancel Consultation
            </button>
          )}
        </div>
      </div>

      {/* Confirm Cancel Dialog */}
      {showConfirm && (
        <div className="cancel-overlay">
          <div className="cancel-dialog">
            <div className="cancel-dialog-icon">
              {Icons.xCircle}
            </div>
            <h3>Cancel Consultation?</h3>
            <p>
              Are you sure you want to cancel this appointment? This action cannot be undone.
              You will be able to book a new appointment after cancellation.
            </p>
            <div className="cancel-dialog-actions">
              <button
                className="btn-dialog-keep"
                onClick={() => setShowConfirm(false)}
                disabled={cancelling}
              >
                Keep Appointment
              </button>
              <button
                className="btn-dialog-confirm"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function MyProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleLogout = () => {
    // Clear all session keys from localStorage
    const email = localStorage.getItem("userEmail") || "";
    const keysToRemove = [
      "accessToken",
      "originToken",
      "userEmail",
      "userPhone",
      "userName",
      "userCountry",
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    // Clear email-scoped keys
    if (email) {
      localStorage.removeItem(`meradocPatientId_${email}`);
      localStorage.removeItem(`meradocAppointmentId_${email}`);
    }
    router.push("/dashboard");
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await UserAPI.getUserProfile();
        setProfileData(response.data || response);
      } catch (err) {
        console.warn("API token invalid or expired. Loading default user profile state.", err);
        setProfileData({
          firstName: "User",
          lastName: "Name",
          email: "user@desilink.com",
          phone: "+1 555-0199",
          dob: "1990-01-01",
          bloodGroup: "O+",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (isLoading) {
    return (
      <div className="profile-container" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <h2>Loading profile...</h2>
      </div>
    );
  }

  const firstName = profileData?.firstName || profileData?.name?.split(" ")[0] || "Guest";
  const lastName = profileData?.lastName || profileData?.name?.split(" ")[1] || "User";
  const email = profileData?.email || "n/a";
  const phone = profileData?.phone || "n/a";

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account settings, saved records, and preferences.</p>
      </div>

      <div className="profile-layout">

        {/* ───── Left Sidebar ───── */}
        <aside className="profile-sidebar">
          <ul className="profile-menu">
            <li>
              <button
                className={`menu-link menu-btn ${activeTab === "personal" ? "active" : ""}`}
                onClick={() => setActiveTab("personal")}
              >
                {Icons.user}
                Personal Information
              </button>
            </li>
            <li>
              <button
                className={`menu-link menu-btn ${activeTab === "appointments" ? "active" : ""}`}
                onClick={() => setActiveTab("appointments")}
              >
                {Icons.calendar}
                My Appointments
              </button>
            </li>
            <li>
              <button className="menu-link menu-btn">
                {Icons.records}
                Medical Records
              </button>
            </li>
            <li>
              <button className="menu-link menu-btn">
                {Icons.pill}
                Prescriptions
              </button>
            </li>
            <li>
              <Link href="/consultancy/address" className="menu-link">
                {Icons.map}
                Saved Addresses
              </Link>
            </li>

            <li className="menu-divider"></li>

            <li>
              <Link href="/dashboard" className="menu-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Back to Dashboard
              </Link>
            </li>

            <li>
              <button className="menu-link menu-btn logout" onClick={handleLogout}>
                {Icons.logout}
                Logout
              </button>
            </li>
          </ul>
        </aside>

        {/* ───── Main Details ───── */}
        <main className="profile-main">

          {/* ── Personal Information Tab ── */}
          {activeTab === "personal" && (
            <>
              <div className="section-title">
                Personal Information
                <button className="btn-edit">Edit Profile</button>
              </div>

              <div className="avatar-section">
                <div className="avatar-circle">{firstName.charAt(0).toUpperCase()}</div>
                <div className="avatar-info">
                  <h3>{firstName} {lastName}</h3>
                  <p>Member strictly verified</p>
                  <button className="btn-photo">Change Photo</button>
                </div>
              </div>

              <form onSubmit={(e) => e.preventDefault()}>
                <div className="info-grid">
                  <div className="info-group">
                    <label>First Name</label>
                    <input type="text" className="info-input" defaultValue={firstName} />
                  </div>
                  <div className="info-group">
                    <label>Last Name</label>
                    <input type="text" className="info-input" defaultValue={lastName} />
                  </div>
                  <div className="info-group">
                    <label>Email Address</label>
                    <input type="email" className="info-input" defaultValue={email} readOnly />
                  </div>
                  <div className="info-group">
                    <label>Mobile Number</label>
                    <input type="tel" className="info-input" defaultValue={phone} readOnly />
                  </div>
                  <div className="info-group">
                    <label>Date of Birth</label>
                    <input type="date" className="info-input" defaultValue={profileData?.dob || "1990-01-01"} />
                  </div>
                  <div className="info-group">
                    <label>Blood Group</label>
                    <select className="info-input" defaultValue={profileData?.bloodGroup || "O+"}>
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel">Cancel</button>
                  <button type="submit" className="btn-save">Save Changes</button>
                </div>
              </form>
            </>
          )}

          {/* ── My Appointments Tab ── */}
          {activeTab === "appointments" && (
            <>
              <div className="section-title">
                My Appointments
                <Link href="/consultancy" className="btn-edit">+ Book New</Link>
              </div>
              <MyAppointmentsPanel />
            </>
          )}

        </main>
      </div>
    </div>
  );
}
