"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppointmentService } from "../../../services/appointment.service";
import { useSlots, useRescheduleConsultation, useAddFamilyMember, useRemoveFamilyMember } from "../../../hooks/useApi";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
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
  package: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
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

function todayStr() { return new Date().toISOString().split("T")[0]; }
function maxDateStr() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}
function hourFrom12(t12) {
  if (!t12) return 0;
  const parts = t12.trim().split(" ");
  let h = parseInt((parts[0] || "").split(":")[0]) || 0;
  if (parts[1]?.toUpperCase() === "PM" && h !== 12) h += 12;
  if (parts[1]?.toUpperCase() === "AM" && h === 12) h = 0;
  return h;
}
function groupLabSlots(slots) {
  const g = { Morning: [], Afternoon: [], Evening: [] };
  slots.forEach((s) => {
    const h = s.startTime12hr ? hourFrom12(s.startTime12hr) : parseInt((s.startTime || "0").split(":")[0]);
    if (h < 12) g.Morning.push(s);
    else if (h < 17) g.Afternoon.push(s);
    else g.Evening.push(s);
  });
  return g;
}
function to24h(t12) {
  if (!t12) return "";
  const parts = t12.trim().split(" ");
  if (parts.length < 2) return t12;
  const [time, period] = parts;
  let [h, m] = time.split(":").map(Number);
  if (period.toUpperCase() === "PM" && h !== 12) h += 12;
  if (period.toUpperCase() === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}
function labSlotLabel(s) {
  if (!s || typeof s !== "object") return String(s || "");
  if (s.startTime12hr && s.endTime12hr) return `${s.startTime12hr} - ${s.endTime12hr}`;
  return s.collectionSlotTime || s.displayTime || s.time || s.slotTime || s.label || s.startTime || "";
}
function labSlotId(s) {
  return s?.id || s?.slot_id || s?.slotId || s?._id || s?.slotNo || "";
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
      <div className="pf-skeleton-stack">
        <div className="skeleton pf-skeleton-card" />
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

// ─── Lab Tests Panel ─────────────────────────────────────────────────────────
const LAB_STEPS = [
  { key: "PHLEBO_ASSIGNED",  label: "Phlebotomist Assigned", icon: "🧑‍⚕️" },
  { key: "SAMPLE_COLLECTED", label: "Sample Collected",       icon: "🧪" },
  { key: "REPORT_GENERATED", label: "Report Generated",       icon: "📄" },
  { key: "COMPLETED",        label: "Completed",              icon: "✅" },
];

const LAB_TERMINAL = ["CANCELLED", "COMPLETED", "REPORT_GENERATED"];

function LabOrderCard({ order, patientId, onCancelSuccess, onRescheduleSuccess }) {
  // cancel state
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling,  setCancelling]  = useState(false);
  const [cancelError, setCancelError] = useState("");

  // reschedule state
  const [showReschedule,  setShowReschedule]  = useState(false);
  const [reschedDate,     setReschedDate]     = useState("");
  const [slots,           setSlots]           = useState([]);
  const [loadingSlots,    setLoadingSlots]    = useState(false);
  const [chosenSlot,      setChosenSlot]      = useState(null);
  const [rescheduling,    setRescheduling]    = useState(false);
  const [reschedError,    setReschedError]    = useState("");
  const [reschedSuccess,  setReschedSuccess]  = useState(false);

  const raw          = order.raw_data?.data || order.raw_data || {};
  const displayId    = raw.orderId || order.order_id;
  const tests        = Array.isArray(raw.packageName) ? raw.packageName : (raw.packageName ? [raw.packageName] : []);
  const date         = raw.sampleCollectionDate || raw.collectionDate || "";
  const time         = raw.sampleCollectionTime || raw.collectionSlotTime || "";
  // PARTNER_BOOKING_FAILED is a transient Redcliffe webhook delay — treat as BOOKED
  const rawStatus    = (order.status || raw.orderStatus || raw.order_status || "").toUpperCase();
  const status       = rawStatus === "PARTNER_BOOKING_FAILED" ? "BOOKED" : rawStatus;
  const isProcessing = status === "PROCESSING" || order.pending === true;
  const isCancelled  = !isProcessing && status.includes("CANCEL");
  const isRescheduled = status === "RESCHEDULED";
  const isTerminal   = isCancelled || ["COMPLETED", "REPORT_GENERATED"].includes(status);
  const stepIndex    = isCancelled ? -1 : LAB_STEPS.findIndex((s) => s.key === status);
  const isPastDate   = (() => {
    if (!date) return false;
    const endPart = time ? (time.includes(" - ") ? time.split(" - ")[1].trim() : time.trim()) : "";
    const ampm = endPart.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (ampm) {
      let h = parseInt(ampm[1]), m = parseInt(ampm[2]);
      if (ampm[3].toUpperCase() === "PM" && h !== 12) h += 12;
      if (ampm[3].toUpperCase() === "AM" && h === 12) h = 0;
      const dt = new Date(date); dt.setHours(h, m, 0, 0); return dt < new Date();
    }
    const h24 = endPart.match(/(\d+):(\d+)/);
    if (h24) {
      const dt = new Date(date); dt.setHours(parseInt(h24[1]), parseInt(h24[2]), 0, 0); return dt < new Date();
    }
    return new Date(date + "T23:59:59") < new Date();
  })();

  // Fetch slots when date changes
  useEffect(() => {
    if (!reschedDate || !showReschedule) return;
    setLoadingSlots(true); setSlots([]); setChosenSlot(null); setReschedError("");
    // Use location from the order's own raw_data first (has lat/long/pincode/zoneId from booking)
    // Fall back to per-email localStorage — never use the shared ltLocation key
    const email = localStorage.getItem("userEmail") || "";
    const locFallback = (() => { try { return JSON.parse(localStorage.getItem(`ltLocation_${email}`) || "null") || {}; } catch { return {}; } })();
    const loc = {
      lat:     String(raw.lat     || locFallback.lat     || "0"),
      long:    String(raw.long    || locFallback.long    || "0"),
      pincode: String(raw.sampleCollectionAddress_PinCode || raw.pincode || locFallback.pincode || ""),
      zoneId:  String(raw.zoneId  || locFallback.zoneId  || ""),
    };
    const codes = Array.isArray(raw.packageCode) ? raw.packageCode : (raw.packageCode ? [raw.packageCode] : []);
    const names = Array.isArray(raw.packageName) ? raw.packageName : (raw.packageName ? [raw.packageName] : []);
    const ptype = raw.productType || "PACKAGE";
    const testList = codes.length ? codes.map((c, i) => ({ id: c, type: ptype, name: names[i] || "" })) : [{ id: displayId, type: ptype, name: names[0] || "" }];

    import("../../../services/diagnostic.service").then(({ DiagnosticService }) =>
      DiagnosticService.getPhleboSlots({
        date: reschedDate,
        lat:     loc.lat,
        long:    loc.long,
        zipcode: loc.pincode,
        ...(loc.zoneId ? { zoneId: loc.zoneId } : {}),
        patients: [{ name: raw.patientName || localStorage.getItem("userName") || "Patient", gender: (raw.gender || "Male").toUpperCase(), age: String(raw.age || 25), ageType: "YEAR" }],
        testList,
      })
    ).then((data) => {
      const rawData = data?.data;
      let list = [];
      if (Array.isArray(rawData)) list = rawData.flatMap((p) => Array.isArray(p.slots) ? p.slots : []);
      else if (Array.isArray(rawData?.slots)) list = rawData.slots;
      else if (Array.isArray(data?.slots)) list = data.slots;
      setSlots(list);
      if (!list.length) setReschedError("No slots available for this date. Try another.");
    }).catch(() => setReschedError("Failed to load slots. Please try again."))
      .finally(() => setLoadingSlots(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reschedDate, showReschedule]);

  const handleCancel = async () => {
    setCancelling(true); setCancelError("");
    const effectivePid = patientId || raw.patientId || "";
    try {
      const { DiagnosticService } = await import("../../../services/diagnostic.service");
      const { UserService }       = await import("../../../services/user.service");
      await UserService.generateToken(); // ensure a fresh token is in localStorage before cancel
      await DiagnosticService.cancelOrder({ orderId: displayId, patientId: effectivePid, cancelReason: "Patient request" });
      setShowConfirm(false);
      onCancelSuccess(order.order_id);
    } catch (err) {
      const msg = (err?.response?.data?.message || err.message || "").toLowerCase();
      // "order cannot be cancelled" / "already cancelled" both mean MeraDoc considers it done
      if (msg.includes("already cancel") || msg.includes("cannot be cancel")) {
        setShowConfirm(false);
        onCancelSuccess(order.order_id);
      } else {
        setCancelError(err?.response?.data?.message || err.message || "Cancellation failed. Please try again.");
      }
    } finally { setCancelling(false); }
  };

  const handleReschedule = async () => {
    if (!chosenSlot) return;
    setRescheduling(true); setReschedError("");
    const effectivePid = patientId || raw.patientId || "";
    try {
      const { DiagnosticService } = await import("../../../services/diagnostic.service");
      const { UserService }       = await import("../../../services/user.service");
      await UserService.generateToken(); // ensure a fresh token is in localStorage before reschedule
      await DiagnosticService.rescheduleOrder({
        orderId:         displayId,
        patientId:       effectivePid,
        appointmentDate: reschedDate,
        reasonKey:       "OTHER",
        reasonText:      "Patient unavailable on original date",
        slotDetails: {
          slot_id:        String(labSlotId(chosenSlot) || "1"),
          collectionSlot: to24h(chosenSlot.startTime12hr) || chosenSlot.startTime || labSlotLabel(chosenSlot),
        },
      });
      setReschedSuccess(true);
      setShowReschedule(false);
      onRescheduleSuccess(order.order_id, reschedDate, labSlotLabel(chosenSlot));
    } catch (err) {
      const msg = (err?.response?.data?.message || err.message || "").toLowerCase();
      if (msg.includes("already cancelled") || msg.includes("already canceled")) {
        setShowReschedule(false);
        onCancelSuccess(order.order_id);
      } else {
        setReschedError(err?.response?.data?.message || err.message || "Reschedule failed. Please try again.");
      }
    } finally { setRescheduling(false); }
  };

  return (
    <div className="lab-tracker-card" style={{ marginBottom: "1rem" }}>
      {isProcessing && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "8px", padding: "0.7rem 1rem", marginBottom: "0.75rem", fontSize: "0.85rem", color: "#92400e", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.1rem" }}>⏳</span>
          <div>
            <strong>Booking is being confirmed</strong> — your order has been submitted and is awaiting confirmation from the lab partner. This usually takes 2–3 minutes.
          </div>
        </div>
      )}
      <div className="lab-tracker-head">
        <div>
          <p className="apt-meta-label">Order ID</p>
          <p className="apt-meta-value apt-id-text">{isProcessing ? "Pending" : displayId}</p>
        </div>
        {(date || reschedSuccess) && (
          <div>
            <p className="apt-meta-label">Collection Date</p>
            <p className="apt-meta-value">{reschedSuccess ? reschedDate : date}{!reschedSuccess && time ? ` · ${time}` : ""}</p>
          </div>
        )}
        <div>
          <p className="apt-meta-label">Updated</p>
          <p className="apt-meta-value">
            {new Date(order.updated_at).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {tests.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", margin: "0.5rem 0" }}>
          {tests.map((t, i) => <span key={i} className="lt-partner-tag">{t}</span>)}
        </div>
      )}

      {reschedSuccess && (
        <div className="apt-success-banner" style={{ margin: "0.5rem 0" }}>
          {Icons.checkCircle}<span>Order rescheduled to {reschedDate}!</span>
        </div>
      )}

      {isCancelled ? (
        <div className="lab-cancelled-card" style={{ marginTop: "0.5rem" }}>
          <span>❌</span><span>Order Cancelled</span>
        </div>
      ) : isRescheduled ? (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.7rem 1rem", marginTop: "0.5rem", fontSize: "0.85rem", color: "#1e40af" }}>
          🔄 <strong>Rescheduled</strong> — Sample collection on <strong>{date}</strong>{time ? ` · ${time}` : ""}
        </div>
      ) : (
        <div className="lab-steps">
          {LAB_STEPS.map((step, i) => {
            const done    = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <div key={step.key} className={`lab-step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                <div className="lab-step-icon-wrap">
                  <span className="lab-step-icon">{done ? "✓" : step.icon}</span>
                  {i < LAB_STEPS.length - 1 && <div className={`lab-step-line ${done && i < stepIndex ? "done" : ""}`} />}
                </div>
                <p className="lab-step-label">{step.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons — for all non-terminal, non-past orders */}
      {!isTerminal && !isPastDate && !reschedSuccess && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          {!showReschedule && !showConfirm && (
            <>
              <button
                className="btn-reschedule-apt"
                style={{ fontSize: "0.82rem", padding: "0.4rem 0.9rem" }}
                onClick={() => { setShowReschedule(true); setReschedDate(todayStr()); setSlots([]); setChosenSlot(null); setReschedError(""); }}
              >
                {Icons.refresh} Reschedule
              </button>
              <button
                className="btn-cancel-apt"
                style={{ fontSize: "0.82rem", padding: "0.4rem 0.9rem" }}
                onClick={() => { setShowConfirm(true); setCancelError(""); }}
              >
                {Icons.xCircle} Cancel Order
              </button>
            </>
          )}
        </div>
      )}

      {/* Reschedule panel */}
      {showReschedule && !isTerminal && !isPastDate && (
        <div className="reschedule-panel" style={{ marginTop: "0.75rem" }}>
          <h4 className="reschedule-title">Select New Date &amp; Time</h4>

          {/* Date chips — 7 days starting today */}
          <div className="reschedule-dates">
            {getNextDays(7).map((day) => (
              <button
                key={day.dateStr}
                className={`date-chip ${reschedDate === day.dateStr ? "active" : ""}`}
                onClick={() => { setReschedDate(day.dateStr); setChosenSlot(null); setReschedError(""); }}
              >
                <span className="date-chip-label">{day.label}</span>
                <span className="date-chip-num">{day.dayNum}</span>
                <span className="date-chip-month">{day.month}</span>
              </button>
            ))}
          </div>

          {/* Slot chips grouped by period */}
          <div style={{ marginTop: "0.75rem", minHeight: "48px" }}>
            {loadingSlots ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", fontSize: "0.85rem" }}>
                <div className="apt-spinner-sm" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                Loading available slots…
              </div>
            ) : slots.length === 0 ? (
              <p className="slots-empty">No slots available for this date. Try another.</p>
            ) : (
              <div className="slot-groups">
                {Object.entries(groupLabSlots(slots)).map(([period, periodSlots]) =>
                  periodSlots.length > 0 ? (
                    <div key={period} className="slot-group">
                      <p className="slot-group-label">{period}</p>
                      <div className="slot-chips">
                        {periodSlots.map((s, i) => (
                          <button
                            key={i}
                            className={`slot-chip ${chosenSlot && String(labSlotId(chosenSlot)) === String(labSlotId(s)) ? "active" : ""}`}
                            onClick={() => setChosenSlot(s)}
                          >
                            {labSlotLabel(s)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>

          {reschedError && <p style={{ color: "#dc2626", fontSize: "0.82rem", margin: "0.5rem 0 0" }}>{reschedError}</p>}

          <div className="reschedule-actions" style={{ marginTop: "1rem" }}>
            <button className="btn-dialog-keep" onClick={() => { setShowReschedule(false); setReschedError(""); }} disabled={rescheduling}>
              Cancel
            </button>
            <button className="btn-confirm-reschedule" onClick={handleReschedule} disabled={!chosenSlot || rescheduling}>
              {rescheduling ? "Rescheduling…" : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {showConfirm && !isTerminal && !isPastDate && (
        <div className="lab-cancel-confirm" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.8rem 1rem", marginTop: "0.5rem" }}>
          <p style={{ fontSize: "0.85rem", color: "#7f1d1d", marginBottom: "0.6rem" }}>
            Are you sure you want to cancel order <strong>{displayId}</strong>? This cannot be undone.
          </p>
          {cancelError && <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{cancelError}</p>}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn-dialog-keep" style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem" }} onClick={() => setShowConfirm(false)} disabled={cancelling}>
              Keep Order
            </button>
            <button className="btn-dialog-confirm" style={{ padding: "0.35rem 0.8rem", fontSize: "0.82rem" }} onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Yes, Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LabTestsPanel() {
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [patientId, setPatientId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = (email, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    fetch(`/api/lab-test-status?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((json) => {
        const realOrders = json.orders || [];
        // Merge pending orders from localStorage, remove any that now have real orders
        const pendingKey = `ltPendingOrders_${email}`;
        let pending = [];
        try { pending = JSON.parse(localStorage.getItem(pendingKey) || "[]"); } catch {}
        // Remove pending entries older than 15 min (webhook should have fired by then)
        const cutoff = Date.now() - 15 * 60 * 1000;
        pending = pending.filter((p) => p.bookedAt > cutoff);
        localStorage.setItem(pendingKey, JSON.stringify(pending));
        setOrders([...pending, ...realOrders]);
      })
      .catch(() => { if (!silent) setError("Failed to load lab test orders."); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "";
    if (!email) { setLoading(false); return; }

    const pid = localStorage.getItem(`meradocPatientId_${email}`) || "";
    setPatientId(pid);
    if (!pid) {
      fetch(`/api/meradoc/patient?email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then(({ patientId: fetchedPid }) => {
          if (fetchedPid) {
            localStorage.setItem(`meradocPatientId_${email}`, fetchedPid);
            setPatientId(fetchedPid);
          }
        })
        .catch(() => {});
    }

    fetchOrders(email);
  }, []);

  const handleCancelSuccess = (orderId) => {
    setOrders((prev) => prev.map((o) => o.order_id === orderId ? { ...o, status: "CANCELLED" } : o));
  };

  const handleRescheduleSuccess = (orderId, newDate, newSlot) => {
    setOrders((prev) => prev.map((o) => {
      if (o.order_id !== orderId) return o;
      const raw = o.raw_data?.data || o.raw_data || {};
      return { ...o, raw_data: { ...o.raw_data, data: { ...raw, collectionDate: newDate, collectionSlotTime: newSlot } } };
    }));
  };

  if (loading) {
    return (
      <div className="pf-skeleton-stack">
        <div className="skeleton pf-skeleton-card" />
        <div className="skeleton pf-skeleton-card" />
      </div>
    );
  }

  if (error) return <p className="lab-error">{error}</p>;

  const email = localStorage.getItem("userEmail") || "";

  if (orders.length === 0) {
    return (
      <div className="apt-panel-empty">
        <div className="apt-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
          </svg>
        </div>
        <h3>No Lab Tests</h3>
        <p>Your booked lab tests will appear here automatically.</p>
        <button
          onClick={() => fetchOrders(email, true)}
          disabled={refreshing}
          style={{ marginTop: "1rem", padding: "0.5rem 1.2rem", borderRadius: "8px", border: "1px solid #1a4fd4", background: "#fff", color: "#1a4fd4", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
        >
          {refreshing ? "Checking..." : "🔄 Check for new orders"}
        </button>
      </div>
    );
  }

  return (
    <div className="lab-panel">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
        <button
          onClick={() => fetchOrders(email, true)}
          disabled={refreshing}
          style={{ padding: "0.35rem 0.9rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 500, cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
        >
          {refreshing ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>
      {orders.map((order) => (
        <LabOrderCard
          key={order.order_id}
          order={order}
          patientId={patientId}
          onCancelSuccess={handleCancelSuccess}
          onRescheduleSuccess={handleRescheduleSuccess}
        />
      ))}
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
      <div className="pf-skeleton-stack">
        <div className="skeleton pf-skeleton-card pf-skeleton-card--sm" />
        <div className="skeleton pf-skeleton-card pf-skeleton-card--sm" />
        <div className="skeleton pf-skeleton-card pf-skeleton-card--sm" />
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
      <div className="pf-skeleton-stack">
        <div className="skeleton pf-skeleton-card" />
        <div className="skeleton pf-skeleton-card" />
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

// ─── Medicine Orders Panel ───────────────────────────────────────────────────
const MED_STATUS_COLORS = {
  PENDING:    { bg: "#fef3c7", color: "#92400e",  label: "Pending" },
  CONFIRMED:  { bg: "#dbeafe", color: "#1e40af",  label: "Confirmed" },
  PROCESSING: { bg: "#ede9fe", color: "#5b21b6",  label: "Processing" },
  SHIPPED:    { bg: "#d1fae5", color: "#065f46",  label: "Shipped" },
  DELIVERED:  { bg: "#f3f4f6", color: "#374151",  label: "Delivered" },
  CANCELLED:  { bg: "#fee2e2", color: "#991b1b",  label: "Cancelled" },
  CREATED:    { bg: "#fef3c7", color: "#92400e",  label: "Created" },
};

function MedicineOrdersPanel() {
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState("");

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const email = localStorage.getItem("userEmail") || "";
      if (!email) { setOrders([]); return; }

      // DB-backed list: orders are persisted server-side when placed, and the
      // route resolves best-effort live status (MeraDoc has no list endpoint).
      const res  = await fetch(`/api/medicine/orders?email=${encodeURIComponent(email)}`);
      const json = await res.json();
      const mapped = (json.orders || []).map((o) => ({
        orderId:         o.order_id,
        placedAt:        o.order?.createdAt || o.updated_at,
        orderStatus:     o.status,
        totalPrice:      o.order?.totalPrice || o.order?.price,
        deliveryCharges: o.order?.deliveryCharges ?? null,
        items:           o.order?.items || [],
        live:            o.order || null,
      }));
      setOrders(mapped);
    } catch (e) {
      setError("Failed to load medicine orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  if (loading) {
    return (
      <div className="pf-skeleton-stack">
        <div className="skeleton pf-skeleton-card" />
        <div className="skeleton pf-skeleton-card" />
      </div>
    );
  }

  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";

  if (orders.length === 0) {
    return (
      <div className="apt-panel-empty">
        <div className="apt-empty-icon">{Icons.package}</div>
        <h3>No Medicine Orders</h3>
        <p>Your medicine orders will appear here after placing an order.</p>
        <button
          onClick={() => loadOrders(true)}
          disabled={refreshing}
          style={{ marginTop: "1rem", padding: "0.5rem 1.2rem", borderRadius: "8px", border: "1px solid #1a4fd4", background: "#fff", color: "#1a4fd4", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
        >
          {refreshing ? "Checking..." : "🔄 Check for orders"}
        </button>
      </div>
    );
  }

  return (
    <div className="lab-panel">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
        <button
          onClick={() => loadOrders(true)}
          disabled={refreshing}
          style={{ padding: "0.35rem 0.9rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", fontWeight: 500, cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}
        >
          {refreshing ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {orders.map((rec) => {
        const live        = rec.live;
        const orderId     = rec.orderId;
        const rawStatus   = ((live?.orderStatus || rec.orderStatus || "PENDING")).toUpperCase();
        const statusStyle = MED_STATUS_COLORS[rawStatus] || MED_STATUS_COLORS.PENDING;
        const placedDate  = rec.placedAt
          ? new Date(rec.placedAt).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
          : (live?.date || "");
        const items       = live?.items || rec.items || [];
        const totalPrice  = live?.totalPrice || rec.totalPrice;
        const deliveryCharges = live?.deliveryCharges ?? rec.deliveryCharges ?? null;
        const address     = live?.addressDetails;

        return (
          <div key={orderId} className="lab-tracker-card" style={{ marginBottom: "1rem" }}>
            {/* Header row */}
            <div className="lab-tracker-head">
              <div>
                <p className="apt-meta-label">Order ID</p>
                <p className="apt-meta-value apt-id-text">{orderId}</p>
              </div>
              {placedDate && (
                <div>
                  <p className="apt-meta-label">Placed On</p>
                  <p className="apt-meta-value">{placedDate}</p>
                </div>
              )}
              <span
                className="apt-status-pill"
                style={{ background: statusStyle.bg, color: statusStyle.color, alignSelf: "flex-start" }}
              >
                {statusStyle.label}
              </span>
            </div>

            {/* Items list */}
            {items.length > 0 && (
              <div style={{ margin: "0.6rem 0", borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem" }}>
                {items.map((item, idx) => {
                  const name = item.name || item.title || "";
                  const qty  = item.quantity || 1;
                  const price = item.discountedMrp || item.mrp || 0;
                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0", fontSize: "0.85rem" }}>
                      <span style={{ color: "#1a1f36", flex: 1 }}>{name}</span>
                      <span style={{ color: "#6b7280", whiteSpace: "nowrap" }}>× {qty}</span>
                      {price > 0 && <span style={{ color: "#374151", fontWeight: 600, whiteSpace: "nowrap" }}>₹{(price * qty).toFixed(2)}</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Price + delivery row */}
            {(totalPrice || deliveryCharges != null) && (
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                {totalPrice && (
                  <div>
                    <p className="apt-meta-label">Total</p>
                    <p className="apt-meta-value" style={{ fontWeight: 700 }}>₹{parseFloat(totalPrice).toFixed(2)}</p>
                  </div>
                )}
                {deliveryCharges != null && (
                  <div>
                    <p className="apt-meta-label">Delivery</p>
                    <p className="apt-meta-value">{deliveryCharges === 0 ? "Free" : `₹${deliveryCharges}`}</p>
                  </div>
                )}
              </div>
            )}

            {/* Delivery address */}
            {address?.addressLine1 && (
              <div style={{ marginTop: "0.5rem", background: "#f8fafc", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.82rem", color: "#4b5563" }}>
                📍 {address.addressLine1}{address.city ? `, ${address.city}` : ""}{address.pincode ? ` — ${address.pincode}` : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
function MyProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "personal");
  const [isLoading, setIsLoading] = useState(true);
  const [userRecord, setUserRecord] = useState(null);

  // Personal info form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", country: "", dob: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
  const phone = typeof window !== "undefined" ? localStorage.getItem("userPhone") || "" : "";

  const handleLogout = () => {
    const keysToRemove = [
      "accessToken", "originToken", "userEmail", "userPhone", "userName", "userCountry",
      "ltCart", "ltLocation", "ltDeliveryCity",
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    if (email) {
      localStorage.removeItem(`meradocPatientId_${email}`);
      localStorage.removeItem(`meradocAppointmentId_${email}`);
    }
    window.dispatchEvent(new Event("lt-nav-update"));
    router.push("/login");
  };

  const buildForm = (u) => {
    const fullName = u?.name || localStorage.getItem("userName") || "";
    const parts = fullName.trim().split(" ");
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      country: u?.country || localStorage.getItem("userCountry") || "",
      dob: u?.dob || "",
    };
  };

  useEffect(() => {
    if (!email) { setIsLoading(false); return; }
    fetch(`/api/users?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((json) => {
        setUserRecord(json.user || null);
        setFormData(buildForm(json.user));
      })
      .catch(() => setFormData(buildForm(null)))
      .finally(() => setIsLoading(false));
  }, [email]);

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    setSaving(true);
    try {
      await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: fullName, country: formData.country }),
      });
      localStorage.setItem("userName", fullName);
      localStorage.setItem("userCountry", formData.country);
      setUserRecord((prev) => ({ ...prev, name: fullName, country: formData.country, dob: formData.dob, blood_group: formData.bloodGroup }));
      setIsEditing(false);
      setSaveMsg("Profile updated successfully.");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(buildForm(userRecord));
    setIsEditing(false);
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  const firstName = formData.firstName || "Guest";
  const lastName = formData.lastName || "";

  return (
    <div className="profile-container">
      <Reveal className="profile-header">
        <h1>My Profile</h1>
        <p>Manage your account settings, saved records, and preferences.</p>
      </Reveal>

      <div className="profile-layout">

        {/* ───── Left Sidebar ───── */}
        <aside className="profile-sidebar">
          <Stagger className="profile-menu">
            <StaggerItem>
              <button
                className={`menu-link menu-btn ${activeTab === "personal" ? "active" : ""}`}
                onClick={() => setActiveTab("personal")}
              >
                {Icons.user}
                Personal Information
              </button>
            </StaggerItem>
            <StaggerItem>
              <button
                className={`menu-link menu-btn ${activeTab === "appointments" ? "active" : ""}`}
                onClick={() => setActiveTab("appointments")}
              >
                {Icons.calendar}
                My Appointments
              </button>
            </StaggerItem>
            <StaggerItem>
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
            </StaggerItem>
            <StaggerItem>
              <button
                className={`menu-link menu-btn ${activeTab === "labtests" ? "active" : ""}`}
                onClick={() => setActiveTab("labtests")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
                </svg>
                Lab Tests
              </button>
            </StaggerItem>
            <StaggerItem>
              <button
                className={`menu-link menu-btn ${activeTab === "medorders" ? "active" : ""}`}
                onClick={() => setActiveTab("medorders")}
              >
                {Icons.package}
                Medicine Orders
              </button>
            </StaggerItem>
            <StaggerItem>
              <button className="menu-link menu-btn">
                {Icons.records}
                Medical Records
              </button>
            </StaggerItem>
            <StaggerItem>
              <button
                className={`menu-link menu-btn ${activeTab === "prescriptions" ? "active" : ""}`}
                onClick={() => setActiveTab("prescriptions")}
              >
                {Icons.pill}
                Prescriptions
              </button>
            </StaggerItem>
            <StaggerItem>
              <Link href="/consultancy/address" className="menu-link">
                {Icons.map}
                Saved Addresses
              </Link>
            </StaggerItem>

            <StaggerItem className="menu-divider" />

            <StaggerItem>
              <Link href="/dashboard" className="menu-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Back to Dashboard
              </Link>
            </StaggerItem>
          </Stagger>
        </aside>

        {/* ───── Main Details ───── */}
        <main className="profile-main">

          {/* ── Personal Information Tab ── */}
          {activeTab === "personal" && (
            <>
              <div className="section-title">
                Personal Information
                {!isEditing && (
                  <button className="btn-edit" onClick={() => setIsEditing(true)}>Edit Profile</button>
                )}
              </div>

              {saveMsg && (
                <div className="apt-success-banner" style={{ marginBottom: "16px" }}>
                  {Icons.checkCircle}
                  <span>{saveMsg}</span>
                </div>
              )}

              <div className="avatar-section">
                <div className="avatar-circle">{firstName.charAt(0).toUpperCase()}</div>
                <div className="avatar-info">
                  <h3>{firstName} {lastName}</h3>
                  <p>Member verified</p>
                </div>
              </div>

              <form onSubmit={handleSave}>
                <div className="info-grid">
                  <div className="info-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      className="info-input"
                      value={formData.firstName}
                      onChange={handleFieldChange}
                      readOnly={!isEditing}
                      style={!isEditing ? { background: "#f5f7fa", cursor: "default" } : {}}
                    />
                  </div>
                  <div className="info-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      className="info-input"
                      value={formData.lastName}
                      onChange={handleFieldChange}
                      readOnly={!isEditing}
                      style={!isEditing ? { background: "#f5f7fa", cursor: "default" } : {}}
                    />
                  </div>
                  <div className="info-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="info-input"
                      value={email}
                      readOnly
                      style={{ background: "#f5f7fa", cursor: "not-allowed", color: "#6b7280" }}
                    />
                  </div>
                  <div className="info-group">
                    <label>Mobile Number</label>
                    <input
                      type="tel"
                      className="info-input"
                      value={phone}
                      readOnly
                      style={{ background: "#f5f7fa", cursor: "not-allowed", color: "#6b7280" }}
                    />
                  </div>
                  <div className="info-group">
                    <label>Country of Residence</label>
                    <input
                      type="text"
                      name="country"
                      className="info-input"
                      value={formData.country}
                      onChange={handleFieldChange}
                      readOnly={!isEditing}
                      style={!isEditing ? { background: "#f5f7fa", cursor: "default" } : {}}
                    />
                  </div>
                  <div className="info-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      className="info-input"
                      value={formData.dob}
                      readOnly
                      style={{ background: "#f5f7fa", cursor: "not-allowed", color: "#6b7280" }}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={handleCancel} disabled={saving}>Cancel</button>
                    <button type="submit" className="btn-save" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
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

          {/* ── Lab Tests Tab ── */}
          {activeTab === "labtests" && (
            <>
              <div className="section-title">Lab Tests</div>
              <LabTestsPanel />
            </>
          )}

          {/* ── Family Members Tab ── */}
          {activeTab === "family" && (
            <>
              <div className="section-title">Family Members</div>
              <FamilyMembersPanel />
            </>
          )}

          {/* ── Medicine Orders Tab ── */}
          {activeTab === "medorders" && (
            <>
              <div className="section-title">Medicine Orders</div>
              <MedicineOrdersPanel />
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

// ─── Skeleton shell for the initial profile load / Suspense fallback ────────
function ProfileSkeleton() {
  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="skeleton skeleton-text" style={{ width: "200px", height: "28px", marginBottom: "10px" }} />
        <div className="skeleton skeleton-text" style={{ width: "340px" }} />
      </div>
      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="pf-skeleton-stack">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "40px", borderRadius: "8px" }} />
            ))}
          </div>
        </aside>
        <main className="profile-main">
          <div className="skeleton pf-skeleton-card" />
        </main>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <MyProfilePageInner />
    </Suspense>
  );
}
