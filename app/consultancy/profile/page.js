"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserAPI } from "../../../lib/api";
import { AppointmentService } from "../../../services/appointment.service";
import { useSlots, useRescheduleConsultation, useAddFamilyMember, useRemoveFamilyMember } from "../../../hooks/useApi";
import "./profile.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isAppointmentMissed(apt) {
  if (!apt) return false;
  if (["CANCELLED", "COMPLETED"].includes(apt.appointmentStatus)) return false;
  const dateStr = apt.appointmentDate;
  const endTime = apt.appointmentEndTime;
  if (!dateStr || !endTime) return false;
  const endDateTime = new Date(`${dateStr}T${endTime}:00`);
  return new Date() > endDateTime;
}

function getNextDays(count = 7) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toISOString().split("T")[0],
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en", { weekday: "short" }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en", { month: "short" }),
    };
  });
}

function groupSlots(slots) {
  const g = { Morning: [], Afternoon: [], Evening: [] };
  slots.forEach((s) => {
    const h = parseInt(s.start?.split(":")[0] || "0");
    if (h < 12) g.Morning.push(s);
    else if (h < 17) g.Afternoon.push(s);
    else g.Evening.push(s);
  });
  return g;
}

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

  // Reschedule state
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(null);
  const [rescheduleSlot, setRescheduleSlot] = useState(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const days = getNextDays(7);
  const selectedDate = rescheduleDate || days[0].dateStr;
  const { mutateAsync: reschedule, isPending: isRescheduling } = useRescheduleConsultation();

  const doctorId =
    appointment?.doctorDetails?._id ||
    appointment?.doctorDetails?.id ||
    appointment?.doctorId ||
    null;

  const { data: slotsResponse, isLoading: slotsLoading } = useSlots(
    {
      startDate: selectedDate,
      endDate: selectedDate,
      "doctorIds[]": doctorId,
    },
    { enabled: showReschedule && !!doctorId }
  );

  const allSlots = (() => {
    const data = slotsResponse?.data;
    if (!data || !Array.isArray(data)) return [];
    const flat = [];
    data.forEach((dateObj) => {
      if (dateObj && typeof dateObj === "object") {
        Object.values(dateObj).forEach((arr) => {
          if (Array.isArray(arr)) flat.push(...arr);
        });
      }
    });
    return flat;
  })();
  const groupedSlots = groupSlots(allSlots);

  const handleReschedule = async () => {
    if (!rescheduleSlot || !appointment?._id) return;
    try {
      await reschedule({
        appointmentId: appointment._id,
        data: {
          updateType: "RESCHEDULE",
          appointmentDate: selectedDate,
          appointmentStartTime: rescheduleSlot.start,
          appointmentEndTime: rescheduleSlot.end,
          slotId: rescheduleSlot._id,
        },
      });
      setRescheduleSuccess(true);
      setShowReschedule(false);
      setAppointment((prev) => ({
        ...prev,
        appointmentDate: selectedDate,
        appointmentStartTime: rescheduleSlot.start,
        appointmentEndTime: rescheduleSlot.end,
      }));
    } catch (err) {
      console.error("Reschedule failed:", err);
      setAptError("Failed to reschedule. Please try again.");
    }
  };

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
      const apt = response?.data || null;

      if (isAppointmentMissed(apt)) {
        if (email) localStorage.removeItem(`meradocAppointmentId_${email}`);
        setAppointment({ ...apt, _missed: true });
        return;
      }

      // Check if MeraDoc has sent a terminal status via webhook
      const TERMINAL = ["COMPLETED", "CANCELLED"];
      const MISSED_SUB = ["PATIENT_MISSED", "DOCTOR_MISSED"];
      try {
        const statusRes = await fetch(`/api/appointment-status?appointmentId=${appointmentId}`);
        const statusJson = await statusRes.json();
        const update = statusJson.statusUpdate;
        if (update) {
          const isMissedSub = MISSED_SUB.includes(update.sub_status);
          if (TERMINAL.includes(update.status) && isMissedSub) {
            if (email) localStorage.removeItem(`meradocAppointmentId_${email}`);
            setAppointment({ ...apt, _missed: true });
            return;
          }
          if (TERMINAL.includes(update.status)) {
            if (email) localStorage.removeItem(`meradocAppointmentId_${email}`);
          }
        }
      } catch (_) {}

      setAppointment(apt);
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

  if (appointment._missed) {
    return (
      <div className="apt-panel-empty">
        <div className="apt-empty-icon" style={{ background: "#fef3c7", color: "#92400e" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3>Appointment Missed</h3>
        <p>Your appointment on <strong>{appointment.appointmentDate}</strong> at <strong>{formatTime(appointment.appointmentStartTime)}</strong> has passed.</p>
        <Link href="/consultancy" className="btn-book-new">Book New Appointment</Link>
      </div>
    );
  }

  const statusStyle = STATUS_COLORS[appointment.appointmentStatus] || STATUS_COLORS.PENDING;
  const isActive = !["CANCELLED", "COMPLETED"].includes(appointment.appointmentStatus);
  const doctor = appointment.doctorDetails;

  return (
    <div className="apt-panel">
      {rescheduleSuccess && (
        <div className="apt-success-banner">
          {Icons.checkCircle}
          <span>Appointment rescheduled successfully!</span>
        </div>
      )}

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
            <>
              <button
                className="btn-reschedule-apt"
                onClick={() => { setShowReschedule((v) => !v); setRescheduleSlot(null); }}
              >
                {Icons.refresh}
                Reschedule
              </button>
              <button
                className="btn-cancel-apt"
                onClick={() => setShowConfirm(true)}
                disabled={cancelling}
              >
                {Icons.xCircle}
                Cancel Consultation
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reschedule Panel */}
      {showReschedule && (
        <div className="reschedule-panel">
          <h4 className="reschedule-title">Select New Date &amp; Time</h4>

          {/* Date chips */}
          <div className="reschedule-dates">
            {days.map((day) => (
              <button
                key={day.dateStr}
                className={`date-chip ${selectedDate === day.dateStr ? "active" : ""}`}
                onClick={() => { setRescheduleDate(day.dateStr); setRescheduleSlot(null); }}
              >
                <span className="date-chip-label">{day.label}</span>
                <span className="date-chip-num">{day.dayNum}</span>
                <span className="date-chip-month">{day.month}</span>
              </button>
            ))}
          </div>

          {/* Slot picker */}
          {slotsLoading ? (
            <div className="slots-loading">
              <div className="apt-spinner-sm" />
              <p>Loading slots...</p>
            </div>
          ) : allSlots.length === 0 ? (
            <p className="slots-empty">No slots available for this date.</p>
          ) : (
            <div className="slot-groups">
              {Object.entries(groupedSlots).map(([period, slots]) =>
                slots.length > 0 ? (
                  <div key={period} className="slot-group">
                    <p className="slot-group-label">{period}</p>
                    <div className="slot-chips">
                      {slots.map((slot) => (
                        <button
                          key={slot._id}
                          className={`slot-chip ${rescheduleSlot?._id === slot._id ? "active" : ""}`}
                          onClick={() => setRescheduleSlot(slot)}
                        >
                          {formatTime(slot.start)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Actions */}
          <div className="reschedule-actions">
            <button
              className="btn-dialog-keep"
              onClick={() => { setShowReschedule(false); setRescheduleSlot(null); }}
              disabled={isRescheduling}
            >
              Cancel
            </button>
            <button
              className="btn-confirm-reschedule"
              onClick={handleReschedule}
              disabled={!rescheduleSlot || isRescheduling}
            >
              {isRescheduling ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      )}

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

// ─── Family Members Panel ────────────────────────────────────────────────────
const RELATIONSHIPS = ["Son", "Daughter", "Spouse", "Father", "Mother", "Brother", "Sister", "Other"];
const GENDERS = ["Male", "Female", "Others"];

const BLANK_FORM = { name: "", phoneNumber: "", dob: "", gender: "", relationship: "" };

function FamilyMembersPanel() {
  const [members, setMembers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { mutateAsync: addMember, isPending: isAdding } = useAddFamilyMember();
  const { mutateAsync: removeMember, isPending: isRemoving } = useRemoveFamilyMember();

  const getPatientIdLocal = () => {
    const email = localStorage.getItem("userEmail") || "";
    return email ? localStorage.getItem(`meradocPatientId_${email}`) : null;
  };

  const fetchMembers = async () => {
    const patientId = getPatientIdLocal();
    if (!patientId) { setLoadingList(false); return; }
    try {
      const res = await fetch(`/api/family-members?patientId=${encodeURIComponent(patientId)}`);
      const json = await res.json();
      setMembers(json.members || []);
    } catch (_) {}
    setLoadingList(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.name || !form.phoneNumber || !form.dob || !form.gender || !form.relationship) {
      setFormError("All fields are required.");
      return;
    }
    const patientId = getPatientIdLocal();
    if (!patientId) { setFormError("Patient ID not found. Please complete registration first."); return; }

    const age = Math.floor((new Date() - new Date(form.dob)) / (365.25 * 24 * 60 * 60 * 1000));
    const member = { ...form, age, phoneNumber: String(form.phoneNumber) };

    try {
      const response = await addMember({ patientId, members: [member] });
      const memberAccountId = response?.data?.[0]?._id || response?.data?._id || null;

      // Save to our DB for listing
      await fetch("/api/family-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, member, memberAccountId }),
      });

      setSuccessMsg(`${form.name} added successfully.`);
      setForm(BLANK_FORM);
      setShowForm(false);
      fetchMembers();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to add family member. Please try again.";
      setFormError(msg);
    }
  };

  const handleRemove = async (member) => {
    const patientId = getPatientIdLocal();
    if (!patientId) return;
    try {
      if (member.member_account_id) {
        await removeMember({ patientId, memberAccountId: member.member_account_id });
      }
      await fetch(`/api/family-members?id=${member.id}`, { method: "DELETE" });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (_) {}
  };

  if (loadingList) {
    return (
      <div className="apt-panel-loading">
        <div className="apt-spinner-sm" />
        <p>Loading family members...</p>
      </div>
    );
  }

  return (
    <div className="fm-panel">
      {successMsg && (
        <div className="apt-success-banner">
          {Icons.checkCircle}
          <span>{successMsg}</span>
        </div>
      )}

      {/* Member cards */}
      {members.length === 0 && !showForm && (
        <div className="apt-panel-empty">
          <div className="apt-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3>No Family Members</h3>
          <p>Add family members to book consultations on their behalf.</p>
        </div>
      )}

      {members.length > 0 && (
        <div className="fm-list">
          {members.map((m) => (
            <div key={m.id} className="fm-card">
              <div className="fm-avatar">{(m.name || "?").charAt(0).toUpperCase()}</div>
              <div className="fm-info">
                <p className="fm-name">{m.name}</p>
                <p className="fm-meta">{m.relationship} • {m.gender} • {m.age ? `${m.age} yrs` : m.dob}</p>
                {m.phone_number && <p className="fm-meta">{m.phone_number}</p>}
              </div>
              <button className="fm-remove-btn" onClick={() => handleRemove(m)} disabled={isRemoving} title="Remove">
                {Icons.xCircle}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <form className="fm-form" onSubmit={handleAdd}>
          <h4 className="fm-form-title">Add Family Member</h4>
          {formError && <p className="fm-form-error">{formError}</p>}
          <div className="fm-form-grid">
            <div className="info-group">
              <label>Full Name</label>
              <input className="info-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Priya Sharma" />
            </div>
            <div className="info-group">
              <label>Phone Number</label>
              <input className="info-input" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="10-digit number" maxLength={10} />
            </div>
            <div className="info-group">
              <label>Date of Birth</label>
              <input className="info-input" type="date" name="dob" value={form.dob} onChange={handleChange} />
            </div>
            <div className="info-group">
              <label>Gender</label>
              <select className="info-input" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="info-group">
              <label>Relationship</label>
              <select className="info-input" name="relationship" value={form.relationship} onChange={handleChange}>
                <option value="">Select Relationship</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="fm-form-actions">
            <button type="button" className="btn-cancel" onClick={() => { setShowForm(false); setFormError(""); setForm(BLANK_FORM); }}>Cancel</button>
            <button type="submit" className="btn-save" disabled={isAdding}>{isAdding ? "Adding..." : "Add Member"}</button>
          </div>
        </form>
      ) : (
        <button className="fm-add-btn" onClick={() => setShowForm(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Family Member
        </button>
      )}
    </div>
  );
}

// ─── Prescriptions Panel ─────────────────────────────────────────────────────
function PrescriptionsPanel() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "";
    const patientId = email ? localStorage.getItem(`meradocPatientId_${email}`) : null;
    if (!patientId) { setLoading(false); return; }

    fetch(`/api/prescriptions?patientId=${encodeURIComponent(patientId)}`)
      .then((r) => r.json())
      .then((json) => setPrescriptions(json.prescriptions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="apt-panel-loading">
        <div className="apt-spinner-sm" />
        <p>Loading prescriptions...</p>
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="apt-panel-empty">
        <div className="apt-empty-icon">{Icons.pill}</div>
        <h3>No Prescriptions Yet</h3>
        <p>Your prescriptions will appear here after a completed consultation.</p>
      </div>
    );
  }

  return (
    <div className="rx-list">
      {prescriptions.map((rx, i) => {
        const p = rx.raw_data?.prescription || {};
        const diag = p.diagnosisAndObservations || {};
        const meds = p.medicines || [];
        const imgUrls = p.prescriptionImgUrls || [];
        const labTests = p.labTests || [];
        const radiology = p.radiology || [];
        const doctor = rx.raw_data?.doctorDetails || {};
        const dateLabel = p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
          : new Date(rx.created_at).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });

        return (
          <div key={i} className="rx-card">
            {/* Card header */}
            <div className="rx-card-head">
              <div>
                <p className="apt-meta-label">Prescription Date</p>
                <p className="apt-meta-value">{dateLabel}</p>
              </div>
              {doctor.name && (
                <div>
                  <p className="apt-meta-label">Doctor</p>
                  <p className="apt-meta-value">Dr. {doctor.name}</p>
                </div>
              )}
              {rx.appointment_display_id && (
                <div>
                  <p className="apt-meta-label">Appointment</p>
                  <p className="apt-meta-value apt-id-text">{rx.appointment_display_id}</p>
                </div>
              )}
              {imgUrls.length > 0 && (
                <a href={imgUrls[0]} target="_blank" rel="noopener noreferrer" className="rx-view-btn">
                  View Prescription
                </a>
              )}
            </div>

            {/* Diagnosis */}
            {(diag.chiefComplaints || diag.diagnosis) && (
              <div className="rx-section">
                {diag.chiefComplaints && (
                  <div className="rx-row"><span className="rx-key">Chief Complaints</span><span className="rx-val">{diag.chiefComplaints}</span></div>
                )}
                {diag.diagnosis && (
                  <div className="rx-row"><span className="rx-key">Diagnosis</span><span className="rx-val">{diag.diagnosis}</span></div>
                )}
                {diag.allergies && (
                  <div className="rx-row"><span className="rx-key">Allergies</span><span className="rx-val">{diag.allergies}</span></div>
                )}
              </div>
            )}

            {/* Medicines */}
            {meds.length > 0 && (
              <div className="rx-section">
                <p className="rx-section-title">Medicines</p>
                <table className="rx-table">
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

            {/* Lab tests & radiology */}
            {(labTests.length > 0 || radiology.length > 0) && (
              <div className="rx-section rx-tags-row">
                {labTests.length > 0 && (
                  <div>
                    <p className="rx-section-title">Lab Tests</p>
                    <div className="rx-tags">{labTests.map((t, j) => <span key={j} className="rx-tag">{t}</span>)}</div>
                  </div>
                )}
                {radiology.length > 0 && (
                  <div>
                    <p className="rx-section-title">Radiology</p>
                    <div className="rx-tags">{radiology.map((r, j) => <span key={j} className="rx-tag">{r}</span>)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Special instruction */}
            {p.specialInstruction && (
              <div className="rx-section">
                <div className="rx-row"><span className="rx-key">Special Instruction</span><span className="rx-val">{p.specialInstruction}</span></div>
              </div>
            )}
          </div>
        );
      })}
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
              <button
                className={`menu-link menu-btn ${activeTab === "family" ? "active" : ""}`}
                onClick={() => setActiveTab("family")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Family Members
              </button>
            </li>
            <li>
              <button className="menu-link menu-btn">
                {Icons.records}
                Medical Records
              </button>
            </li>
            <li>
              <button
                className={`menu-link menu-btn ${activeTab === "prescriptions" ? "active" : ""}`}
                onClick={() => setActiveTab("prescriptions")}
              >
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

          {/* ── Family Members Tab ── */}
          {activeTab === "family" && (
            <>
              <div className="section-title">Family Members</div>
              <FamilyMembersPanel />
            </>
          )}

          {/* ── Prescriptions Tab ── */}
          {activeTab === "prescriptions" && (
            <>
              <div className="section-title">
                My Prescriptions
              </div>
              <PrescriptionsPanel />
            </>
          )}

        </main>
      </div>
    </div>
  );
}
