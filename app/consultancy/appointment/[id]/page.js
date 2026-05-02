"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppointmentDetails, useGenerateToken } from "../../../../hooks/useApi";
import { useState, useEffect } from "react";
import "./appointment.css";

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function StatusBadge({ status }) {
  const colors = {
    PENDING:    { bg: "#fef3c7", color: "#92400e" },
    CONFIRMED:  { bg: "#dbeafe", color: "#1e40af" },
    ONGOING:    { bg: "#d1fae5", color: "#065f46" },
    COMPLETED:  { bg: "#f3f4f6", color: "#374151" },
    CANCELLED:  { bg: "#fee2e2", color: "#991b1b" },
  };
  const style = colors[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      padding: "4px 12px", borderRadius: "999px", fontSize: "0.8rem",
      fontWeight: 600, background: style.bg, color: style.color,
    }}>
      {status}
    </span>
  );
}

export default function AppointmentDetailsPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const appointmentMongoId = params.id;

  const [isTokenReady, setIsTokenReady] = useState(false);
  const { mutateAsync: generateToken } = useGenerateToken();

  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined") {
        if (!localStorage.getItem("accessToken")) {
          try { await generateToken(); } catch (e) { console.error(e); }
        }
        setIsTokenReady(true);
      }
    };
    init();
  }, [generateToken]);

  const { data, isLoading, isError } = useAppointmentDetails(
    isTokenReady ? appointmentMongoId : null
  );

  const apt = data?.data;

  if (!isTokenReady || isLoading) {
    return (
      <div className="apt-page">
        <div className="apt-loading">
          <div className="apt-spinner" />
          <p>Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (isError || !apt) {
    return (
      <div className="apt-page">
        <div className="apt-error">
          <h2>Appointment not found</h2>
          <p>We couldn&apos;t load this appointment. It may have been removed or you may not have access.</p>
          <Link href="/consultancy" className="apt-btn-primary">Back to Consultancy</Link>
        </div>
      </div>
    );
  }

  const doctor = apt.doctorDetails;
  const patient = apt.patientDetails;

  return (
    <div className="apt-page">
      {/* Header */}
      <div className="apt-header">
        <button className="apt-back" onClick={() => router.back()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1>Appointment Details</h1>
      </div>

      <div className="apt-content">
        {/* Status card */}
        <div className="apt-card apt-status-card">
          <div className="apt-status-row">
            <div>
              <p className="apt-label">Appointment ID</p>
              <p className="apt-value apt-id">{apt.appointmentId}</p>
            </div>
            <StatusBadge status={apt.appointmentStatus} />
          </div>
          <div className="apt-row">
            <div>
              <p className="apt-label">Date</p>
              <p className="apt-value">{apt.appointmentDate}</p>
            </div>
            <div>
              <p className="apt-label">Time</p>
              <p className="apt-value">{formatTime(apt.appointmentStartTime)} – {formatTime(apt.appointmentEndTime)}</p>
            </div>
            <div>
              <p className="apt-label">Mode</p>
              <p className="apt-value">{apt.slotType}</p>
            </div>
          </div>
          {apt.reason && (
            <div>
              <p className="apt-label">Reason</p>
              <p className="apt-value">{apt.reason}</p>
            </div>
          )}
        </div>

        {/* Doctor card */}
        {doctor && (
          <div className="apt-card">
            <h3 className="apt-card-title">Doctor</h3>
            <div className="apt-doctor-row">
              {doctor.profileUrl ? (
                <img src={doctor.profileUrl} alt={doctor.firstName} className="apt-avatar" />
              ) : (
                <div className="apt-avatar-fallback">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
              <div>
                <p className="apt-value">Dr. {doctor.firstName} {doctor.lastName}</p>
                <p className="apt-label">{doctor.speciality} • {doctor.expYear} yrs exp</p>
                <p className="apt-label">ID: {doctor.doctorDisplayId}</p>
              </div>
            </div>
          </div>
        )}

        {/* Patient card */}
        {patient && (
          <div className="apt-card">
            <h3 className="apt-card-title">Patient</h3>
            <div className="apt-row">
              <div>
                <p className="apt-label">Name</p>
                <p className="apt-value">{patient.firstName}</p>
              </div>
              <div>
                <p className="apt-label">Phone</p>
                <p className="apt-value">{patient.mobileNumber || apt.patientNumber}</p>
              </div>
              <div>
                <p className="apt-label">Age / Gender</p>
                <p className="apt-value">{patient.age} yrs • {patient.gender}</p>
              </div>
            </div>
          </div>
        )}

        {/* Join call */}
        {apt.meetLinkUrl && apt.appointmentStatus !== "CANCELLED" && apt.appointmentStatus !== "COMPLETED" && (
          <div className="apt-card apt-join-card">
            <h3 className="apt-card-title">Join Consultation</h3>
            <p className="apt-label" style={{ marginBottom: 12 }}>Your consultation link is ready.</p>
            <a
              href={`https://${apt.meetLinkUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="apt-btn-primary apt-join-btn"
            >
              Join Video / Audio Call
            </a>
          </div>
        )}

        {/* Documents */}
        {apt.documents?.length > 0 && (
          <div className="apt-card">
            <h3 className="apt-card-title">Documents</h3>
            <ul className="apt-docs">
              {apt.documents.map((doc, i) => (
                <li key={i}>
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                    {doc.fileName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Link href="/consultancy" className="apt-btn-secondary">Back to Consultancy</Link>
      </div>
    </div>
  );
}
