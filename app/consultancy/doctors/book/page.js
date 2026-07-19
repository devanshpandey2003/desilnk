"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSlots, useBookConsultation, useGenerateToken } from "../../../../hooks/useApi";
import { getPatientId } from "../../../../lib/getPatientId";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import "./book.css";

// ─── Helper: generate next N days ───
function getNextDays(count = 7) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({
      date: d,
      dateStr: d.toISOString().split("T")[0], // YYYY-MM-DD
      dayName: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en", { weekday: "short" }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en", { month: "short" }),
    });
  }
  return days;
}

// ─── Helper: format time ───
function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

// ─── Helper: group slots by time of day ───
function groupSlots(slots) {
  const groups = { morning: [], afternoon: [], evening: [] };
  slots.forEach((slot) => {
    const hour = parseInt(slot.start?.split(":")[0] || "0");
    if (hour < 12) groups.morning.push(slot);
    else if (hour < 17) groups.afternoon.push(slot);
    else groups.evening.push(slot);
  });
  return groups;
}

// ─── Icons ───
const Icons = {
  back: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  check: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  error: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  sunset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="9" x2="12" y2="2"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  video: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
  user: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
};

// ─── BookingContent (uses useSearchParams) ───
function BookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const doctorId = searchParams.get("doctorId") || "";
  const doctorName = searchParams.get("doctorName") || "Doctor";
  const specialty = searchParams.get("specialty") || "";
  const fee = searchParams.get("fee") || "599";
  const doctorType = searchParams.get("doctorType") || "SP";

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [consultMode, setConsultMode] = useState("video");
  const [bookingResult, setBookingResult] = useState(null); // { type: 'success'|'error', message }
  const [isTokenReady, setIsTokenReady] = useState(false);
  const { mutateAsync: generateToken } = useGenerateToken();

  // Ensure token exists and pre-fill patient details
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== "undefined") {
        if (!localStorage.getItem("accessToken")) {
          try {
            await generateToken();
          } catch (e) {
            console.error("Token generation failed", e);
          }
        }
        setPatientName(localStorage.getItem("userName") || "");
        setPatientPhone(localStorage.getItem("userPhone")?.replace(/^\+\d+\s?/, "") || "");
        setIsTokenReady(true);
      }
    };
    initAuth();
  }, [generateToken]);

  const days = useMemo(() => getNextDays(7), []);

  // Default to today
  const dateStr = selectedDate || days[0].dateStr;

  // Slots query — only fetch once token is ready
  const { data: slotsResponse, isLoading: slotsLoading } = useSlots({
    startDate: dateStr,
    endDate: dateStr,
    "doctorIds[]": doctorId,
  }, {
    enabled: isTokenReady,
  });

  const { mutateAsync: bookConsultation, isPending: isBooking } = useBookConsultation();

  // Parse slots from API
  // API returns: { data: [ { "2026-03-22": [ { _id, start, end, startDate, doctorId } ] } ] }
  const allSlots = useMemo(() => {
    const data = slotsResponse?.data;
    if (!data) return [];
    const flatSlots = [];
    // data is an array of date-keyed objects
    if (Array.isArray(data)) {
      data.forEach(dateObj => {
        if (typeof dateObj === "object" && dateObj !== null) {
          Object.values(dateObj).forEach(slotsArr => {
            if (Array.isArray(slotsArr)) {
              flatSlots.push(...slotsArr);
            }
          });
        }
      });
    }
    return flatSlots;
  }, [slotsResponse]);

  const groupedSlots = useMemo(() => groupSlots(allSlots), [allSlots]);

  // ─── Handlers ───
  const handleDateSelect = (d) => {
    setSelectedDate(d);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot) => {
    if (slot.isBlocked || slot.isBooked) return;
    setSelectedSlot(slot);
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleBook = async () => {
    try {
      const startTime = selectedSlot.start || "";
      const endTime = selectedSlot.end || "";

      const patientId = await getPatientId();

      if (!patientId) {
        router.push("/meradoc-register");
        return;
      }

      const email = localStorage.getItem("userEmail") || "";

      const response = await bookConsultation({
        appointmentType: "NORMAL",
        slotId: selectedSlot._id,
        appointmentDate: dateStr,
        appointmentStartTime: startTime,
        appointmentEndTime: endTime,
        reason: reason || "General consultation",
        patientName: patientName,
        patientId,
        doctorType: doctorType,
        doctorId: doctorId,
        modeOfConsult: consultMode,
      });

      const appointmentMongoId   = response?.data?._id;
      const appointmentDisplayId = response?.data?.appointmentId;
      if (appointmentMongoId && email) {
        localStorage.setItem(`meradocAppointmentId_${email}`, appointmentMongoId);
      }

      setBookingResult({
        type: "success",
        mongoId:   appointmentMongoId,
        displayId: appointmentDisplayId,
        message: `Your appointment with ${doctorName} has been booked for ${dateStr} at ${formatTime(startTime)}.`,
      });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      let errorMsg = msg;
      if (status === 409) errorMsg = "This time slot is already booked. Please choose another slot.";
      else if (status === 429) errorMsg = "You already have an upcoming appointment.";
      else if (status === 404) errorMsg = msg;

      setBookingResult({ type: "error", message: errorMsg });
    }
  };

  // ─── Booking Result View ───
  if (bookingResult) {
    return (
      <div className="booking-page">
        <div className="booking-result animate-in">
          <div className={`result-icon ${bookingResult.type}`}>
            {bookingResult.type === "success" ? Icons.check : Icons.error}
          </div>
          <h2>{bookingResult.type === "success" ? "Booking Confirmed!" : "Booking Failed"}</h2>
          <p>{bookingResult.message}</p>
          {bookingResult.type === "success" && bookingResult.displayId && (
            <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "4px" }}>
              Appointment ID: <strong>{bookingResult.displayId}</strong>
            </p>
          )}
          {bookingResult.type === "success" && bookingResult.mongoId && (
            <button className="btn-go-home" onClick={() => router.push(`/consultancy/appointment/${bookingResult.mongoId}`)}>
              View Appointment Details
            </button>
          )}
          {bookingResult.type === "error" && (
            <button className="btn-go-home" onClick={() => { setBookingResult(null); setStep(1); }} style={{ marginRight: 12 }}>
              Try Again
            </button>
          )}
          <button className="btn-go-home" onClick={() => router.push("/consultancy")}>
            Back to Consultancy
          </button>
        </div>
      </div>
    );
  }

  // ─── Step content renderers ───
  const renderStep1 = () => (
    <div className="animate-in">
      <p className="section-label">Select Date</p>
      <Stagger className="date-chips">
        {days.map((d) => (
          <StaggerItem key={d.dateStr}>
            <button
              className={`date-chip ${dateStr === d.dateStr ? "selected" : ""}`}
              onClick={() => handleDateSelect(d.dateStr)}
            >
              <span className="day-name">{d.dayName}</span>
              <span className="day-num">{d.dayNum}</span>
              <span className="month">{d.month}</span>
            </button>
          </StaggerItem>
        ))}
      </Stagger>

      <p className="section-label">Available Slots</p>
      <div className="slots-section">
        {slotsLoading ? (
          <div className="slots-loading">
            <div className="slot-skeleton-row">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="slot-skeleton-chip skeleton" />
              ))}
            </div>
          </div>
        ) : allSlots.length === 0 ? (
          <div className="no-slots">No slots available for this date. Try another day.</div>
        ) : (
          <>
            {groupedSlots.morning.length > 0 && (
              <div className="slot-group">
                <div className="slot-group-title">{Icons.sun} Morning</div>
                <div className="slot-grid">
                  {groupedSlots.morning.map((s) => {
                    const time = s.start || "";
                    const blocked = s.isBlocked || s.isBooked;
                    return (
                      <button
                        key={s._id}
                        className={`slot-chip ${selectedSlot?._id === s._id ? "selected" : ""} ${blocked ? "unavailable" : ""}`}
                        onClick={() => handleSlotSelect(s)}
                        disabled={blocked}
                      >
                        {formatTime(time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {groupedSlots.afternoon.length > 0 && (
              <div className="slot-group">
                <div className="slot-group-title">{Icons.sunset} Afternoon</div>
                <div className="slot-grid">
                  {groupedSlots.afternoon.map((s) => {
                    const time = s.start || "";
                    const blocked = s.isBlocked || s.isBooked;
                    return (
                      <button
                        key={s._id}
                        className={`slot-chip ${selectedSlot?._id === s._id ? "selected" : ""} ${blocked ? "unavailable" : ""}`}
                        onClick={() => handleSlotSelect(s)}
                        disabled={blocked}
                      >
                        {formatTime(time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {groupedSlots.evening.length > 0 && (
              <div className="slot-group">
                <div className="slot-group-title">{Icons.moon} Evening</div>
                <div className="slot-grid">
                  {groupedSlots.evening.map((s) => {
                    const time = s.start || "";
                    const blocked = s.isBlocked || s.isBooked;
                    return (
                      <button
                        key={s._id}
                        className={`slot-chip ${selectedSlot?._id === s._id ? "selected" : ""} ${blocked ? "unavailable" : ""}`}
                        onClick={() => handleSlotSelect(s)}
                        disabled={blocked}
                      >
                        {formatTime(time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="animate-in">
      <p className="section-label">Patient Details</p>
      <div className="patient-form">
        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            placeholder="Enter patient name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Phone Number *</label>
          <input
            type="tel"
            placeholder="Enter phone number"
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Reason for Consultation</label>
          <textarea
            placeholder="Describe your symptoms or reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Mode of Consultation</label>
          <div className="mode-toggle">
            <button
              className={`mode-btn ${consultMode === "video" ? "active" : ""}`}
              onClick={() => setConsultMode("video")}
            >
              {Icons.video} Video Call
            </button>
            <button
              className={`mode-btn ${consultMode === "audio" ? "active" : ""}`}
              onClick={() => setConsultMode("audio")}
            >
              {Icons.phone} Audio Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    const slotTime = selectedSlot?.start || "";
    return (
      <div className="animate-in">
        <p className="section-label">Confirm Your Booking</p>
        <div className="confirm-card">
          <h3>Appointment Summary</h3>
          <div className="confirm-row">
            <span className="confirm-label">Doctor</span>
            <span className="confirm-value">{doctorName}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Specialty</span>
            <span className="confirm-value">{specialty}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Date</span>
            <span className="confirm-value">{dateStr}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Time</span>
            <span className="confirm-value">{formatTime(slotTime)}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Patient</span>
            <span className="confirm-value">{patientName}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Phone</span>
            <span className="confirm-value">{patientPhone}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Mode</span>
            <span className="confirm-value" style={{ textTransform: "capitalize" }}>{consultMode}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Consultation Fee</span>
            <span className="confirm-value" style={{ color: "#0d4b85", fontSize: "1.1rem" }}>₹{fee}</span>
          </div>
          {reason && (
            <div className="confirm-row">
              <span className="confirm-label">Reason</span>
              <span className="confirm-value" style={{ maxWidth: "240px" }}>{reason}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const canGoNext =
    (step === 1 && selectedSlot) ||
    (step === 2 && patientName.trim() && patientPhone.trim());

  return (
    <div className="booking-page">
      {/* Header */}
      <div className="booking-header">
        <Link href={`/consultancy/doctors/${specialty.toLowerCase().replace(/ /g, "-")}`} style={{ color: "#475569", textDecoration: "none", display: "flex" }}>
          {Icons.back}
        </Link>
        <h1>Book Appointment</h1>
      </div>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div className={`step-dot ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
          {step > 1 ? "✓" : "1"}
        </div>
        <div className={`step-line ${step > 1 ? "done" : ""}`}></div>
        <div className={`step-dot ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
          {step > 2 ? "✓" : "2"}
        </div>
        <div className={`step-line ${step > 2 ? "done" : ""}`}></div>
        <div className={`step-dot ${step === 3 ? "active" : ""}`}>3</div>
      </div>

      {/* Doctor Summary */}
      <Reveal>
        <div className="doctor-summary">
          <div className="doc-sum-avatar">{Icons.user}</div>
          <div className="doc-sum-info">
            <h3>{doctorName}</h3>
            <p>{specialty}</p>
          </div>
          <div className="doc-sum-fee">₹{fee}</div>
        </div>
      </Reveal>

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {/* Actions */}
      <div className="booking-actions">
        {step > 1 && (
          <button className="btn-back-step" onClick={handleBack}>
            Back
          </button>
        )}
        {step < 3 ? (
          <button className="btn-next-step" onClick={handleNext} disabled={!canGoNext}>
            {step === 1 ? "Select Slot & Continue" : "Review Booking"}
          </button>
        ) : (
          <button className="btn-next-step" onClick={handleBook} disabled={isBooking}>
            {isBooking ? "Booking..." : "Confirm Booking"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page wrapper with Suspense for useSearchParams ───
export default function BookingPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}
