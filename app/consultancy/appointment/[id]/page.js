"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppointmentDetails, useGenerateToken } from "../../../../hooks/useApi";
import { useState, useEffect } from "react";
import { Reveal } from "@/components/motion";
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
  const [prescriptions, setPrescriptions] = useState([]);
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

  useEffect(() => {
    if (!appointmentMongoId) return;
    fetch(`/api/prescriptions?appointmentId=${encodeURIComponent(appointmentMongoId)}`)
      .then((r) => r.json())
      .then((json) => setPrescriptions(json.prescriptions || []))
      .catch(() => {});
  }, [appointmentMongoId]);

  const apt = data?.data;

  if (!isTokenReady || isLoading) {
    return (
      <div className="apt-page">
        <div className="apt-loading apt-loading--skeleton">
          <div className="apt-skeleton-card skeleton" />
          <div className="apt-skeleton-card apt-skeleton-card--sm skeleton" />
          <div className="apt-skeleton-card apt-skeleton-card--sm skeleton" />
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
        <Reveal>
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
        </Reveal>

        {/* Doctor card */}
        {doctor && (
          <Reveal>
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
          </Reveal>
        )}

        {/* Patient card */}
        {patient && (
          <Reveal>
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
          </Reveal>
        )}

        {/* Join call */}
        {apt.meetLinkUrl && apt.appointmentStatus !== "CANCELLED" && apt.appointmentStatus !== "COMPLETED" && (
          <Reveal>
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
          </Reveal>
        )}

        {/* Prescriptions from webhook */}
        {prescriptions.length > 0 && (
          <Reveal>
          <div className="apt-card">
            <h3 className="apt-card-title">Prescriptions</h3>
            <ul className="apt-docs">
              {prescriptions.map((rx, i) => {
                const p = rx.raw_data?.prescription || {};
                const diag = p.diagnosisAndObservations || {};
                const meds = p.medicines || [];
                const imgUrls = p.prescriptionImgUrls || [];
                const labTests = p.labTests || [];
                const radiology = p.radiology || [];
                const followUp = p.followUp || {};

                return (
                  <li key={i} className="apt-rx-item">
                    {/* Header */}
                    <div className="apt-rx-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span className="apt-rx-label">
                        Prescription {prescriptions.length > 1 ? `#${i + 1}` : ""}
                        <span className="apt-rx-date">
                          {p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
                            : new Date(rx.created_at).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </span>
                    </div>

                    {/* Prescription images */}
                    {imgUrls.length > 0 && (
                      <div className="apt-rx-images">
                        {imgUrls.map((url, j) => (
                          <a key={j} href={url} target="_blank" rel="noopener noreferrer" className="apt-rx-download">
                            View Prescription {imgUrls.length > 1 ? j + 1 : ""}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Diagnosis */}
                    {(diag.chiefComplaints || diag.diagnosis) && (
                      <div className="apt-rx-section">
                        {diag.chiefComplaints && (
                          <div className="apt-rx-row">
                            <span className="apt-rx-key">Chief Complaints</span>
                            <span className="apt-rx-val">{diag.chiefComplaints}</span>
                          </div>
                        )}
                        {diag.diagnosis && (
                          <div className="apt-rx-row">
                            <span className="apt-rx-key">Diagnosis</span>
                            <span className="apt-rx-val">{diag.diagnosis}</span>
                          </div>
                        )}
                        {diag.medHistory && (
                          <div className="apt-rx-row">
                            <span className="apt-rx-key">Medical History</span>
                            <span className="apt-rx-val">{diag.medHistory}</span>
                          </div>
                        )}
                        {diag.allergies && (
                          <div className="apt-rx-row">
                            <span className="apt-rx-key">Allergies</span>
                            <span className="apt-rx-val">{diag.allergies}</span>
                          </div>
                        )}
                        {diag.vitals && (
                          <div className="apt-rx-row">
                            <span className="apt-rx-key">Vitals</span>
                            <span className="apt-rx-val">{diag.vitals}</span>
                          </div>
                        )}
                        {diag.expectedOutcome && (
                          <div className="apt-rx-row">
                            <span className="apt-rx-key">Expected Outcome</span>
                            <span className="apt-rx-val">{diag.expectedOutcome}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Medicines */}
                    {meds.length > 0 && (
                      <div className="apt-rx-section">
                        <p className="apt-rx-section-title">Medicines</p>
                        <table className="apt-rx-table">
                          <thead>
                            <tr>
                              <th>Medicine</th>
                              <th>Type</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {meds.map((m, j) => (
                              <tr key={j}>
                                <td>{m.name || "—"}</td>
                                <td>{m.medType || "—"}</td>
                                <td>{[m.frequency, m.frequencyUnit].filter(Boolean).join(" ") || "—"}</td>
                                <td>{[m.duration, m.durationUnit].filter(Boolean).join(" ") || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Lab tests & Radiology */}
                    {(labTests.length > 0 || radiology.length > 0) && (
                      <div className="apt-rx-section apt-rx-tags-section">
                        {labTests.length > 0 && (
                          <div>
                            <p className="apt-rx-section-title">Lab Tests</p>
                            <div className="apt-rx-tags">
                              {labTests.map((t, j) => <span key={j} className="apt-rx-tag">{t}</span>)}
                            </div>
                          </div>
                        )}
                        {radiology.length > 0 && (
                          <div>
                            <p className="apt-rx-section-title">Radiology</p>
                            <div className="apt-rx-tags">
                              {radiology.map((r, j) => <span key={j} className="apt-rx-tag">{r}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Special instruction & Follow-up */}
                    {(p.specialInstruction || followUp.followUpDateTime) && (
                      <div className="apt-rx-section">
                        {p.specialInstruction && (
                          <div className="apt-rx-row">
                            <span className="apt-rx-key">Special Instruction</span>
                            <span className="apt-rx-val">{p.specialInstruction}</span>
                          </div>
                        )}
                        {followUp.followUpDateTime && (
                          <div className="apt-rx-row">
                            <span className="apt-rx-key">Follow-up</span>
                            <span className="apt-rx-val">{followUp.followUpDateTime}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          </Reveal>
        )}

        {/* Documents attached to appointment */}
        {apt.documents?.length > 0 && (
          <Reveal>
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
          </Reveal>
        )}

        <Link href="/consultancy" className="apt-btn-secondary">Back to Consultancy</Link>
      </div>
    </div>
  );
}
