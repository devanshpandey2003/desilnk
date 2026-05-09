"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDoctors, useSlots, useBookConsultation, useGenerateToken } from "../../../hooks/useApi";
import { getPatientId } from "../../../lib/getPatientId";
import { AppointmentService } from "../../../services/appointment.service";
import "../doctors.css";

/* ─── Helpers ─── */
function isAppointmentMissed(apt) {
  if (!apt) return false;
  if (["CANCELLED", "COMPLETED"].includes(apt.appointmentStatus)) return false;
  const dateStr = apt.appointmentDate;
  const endTime = apt.appointmentEndTime;
  if (!dateStr || !endTime) return false;
  const endDateTime = new Date(`${dateStr}T${endTime}:00`);
  return new Date() > endDateTime;
}

/* ─── Other Helpers ─── */
function getNextDays(count = 7) {
  const days = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({
      date: d,
      dateStr: d.toISOString().split("T")[0],
      dayName: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en", { weekday: "short" }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en", { month: "short" }),
    });
  }
  return days;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

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

/* ─── Icons ─── */
const Icons = {
  back: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  check: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  error: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /></svg>,
  sunset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="9" x2="12" y2="2" /><line x1="1" y1="18" x2="23" y2="18" /></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  video: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81" /></svg>,
  language: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
};

export default function DoctorDetailPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const router = useRouter();
  const doctorId = params.doctorId;

  const [isTokenReady, setIsTokenReady] = useState(false);
  const [step, setStep] = useState(1); // 1=slots, 2=details, 3=confirm
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [consultMode, setConsultMode] = useState("video");
  const [bookingResult, setBookingResult] = useState(null);
  const { mutateAsync: generateToken } = useGenerateToken();

  // Ensure token and pre-fill patient details from localStorage
  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined") {
        if (!localStorage.getItem("accessToken")) {
          try { await generateToken(); } catch (e) { console.error("Token error", e); }
        }
        setPatientName(localStorage.getItem("userName") || "");
        setPatientPhone(localStorage.getItem("userPhone")?.replace(/^\+\d+\s?/, "") || "");
        setIsTokenReady(true);
      }
    };
    init();
  }, [generateToken]);

  // Fetch doctor info from Get Doctors filtered by this ID
  const { data: docResponse, isLoading: docLoading } = useDoctors(
    { doctorId: doctorId },
    { enabled: isTokenReady && !!doctorId }
  );

  const doctor = useMemo(() => {
    const list = docResponse?.data?.list || docResponse?.data?.content || [];
    const raw = Array.isArray(list) ? list : [];
    // Could be a single doc or a list — find our doc
    const doc = raw.find((d) => (d._id || d.id) === doctorId) || raw[0];
    if (!doc) return null;
    return {
      id: doc._id || doc.id,
      name: doc.name || `${doc.firstName || ""} ${doc.lastName || ""}`.trim() || "Doctor",
      specialty: doc.speciality || doc.specialities?.[0]?.name || "General",
      qualifications: doc.degreeName?.join(", ") || doc.qualifications || "MBBS",
      experience: doc.experiences || doc.experience || 0,
      consultationCount: doc.consultationCount || 0,
      languages: Array.isArray(doc.languages) ? doc.languages.join(", ") : doc.languages || "English",
      price: doc.onlineFees || doc.consultationFee || 599,
      doctorType: doc.doctorType || "SP",
      rating: doc.rating || 4.5,
      about: doc.about || doc.bio || "",
      profileUrl: doc.profileUrl || doc.profileImage || doc.image || null,
    };
  }, [docResponse, doctorId]);

  // Days for slot picker
  const days = useMemo(() => getNextDays(7), []);
  const dateStr = selectedDate || days[0].dateStr;

  // Fetch slots
  const { data: slotsResponse, isLoading: slotsLoading } = useSlots(
    { startDate: dateStr, endDate: dateStr, "doctorIds[]": doctorId },
    { enabled: isTokenReady && !!doctorId }
  );

  const allSlots = useMemo(() => {
    const data = slotsResponse?.data;
    if (!data) return [];
    const flat = [];
    if (Array.isArray(data)) {
      data.forEach((dateObj) => {
        if (typeof dateObj === "object" && dateObj !== null) {
          Object.values(dateObj).forEach((arr) => {
            if (Array.isArray(arr)) flat.push(...arr);
          });
        }
      });
    }
    return flat;
  }, [slotsResponse]);

  const groupedSlots = useMemo(() => groupSlots(allSlots), [allSlots]);
  const { mutateAsync: bookConsultation, isPending: isBooking } = useBookConsultation();

  // Handlers
  const handleDateSelect = (d) => { setSelectedDate(d); setSelectedSlot(null); };
  const handleSlotSelect = (slot) => { if (!slot.isBlocked && !slot.isBooked) setSelectedSlot(slot); };
  const handleNext = () => { if (step < 3) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleBook = async () => {
    try {
      const patientId = await getPatientId();

      if (!patientId) {
        router.push("/meradoc-register");
        return;
      }

      const email = localStorage.getItem("userEmail") || "";

      // Block booking if there is an active (non-missed) appointment
      const storedAptId = email ? localStorage.getItem(`meradocAppointmentId_${email}`) : null;
      if (storedAptId) {
        try {
          const aptRes = await AppointmentService.getAppointmentDetails(storedAptId);
          const apt = aptRes?.data;
          const INACTIVE = ["CANCELLED", "COMPLETED"];
          if (apt && !INACTIVE.includes(apt.appointmentStatus) && !isAppointmentMissed(apt)) {
            setBookingResult({
              type: "error",
              message: `You already have an active appointment (${apt.appointmentId}). Please cancel or reschedule it from your profile before booking a new one.`,
            });
            return;
          }
        } catch (_) {
          // If lookup fails, proceed with booking
        }
      }

      const response = await bookConsultation({
        appointmentType: "NORMAL",
        slotId: selectedSlot._id,
        appointmentDate: dateStr,
        appointmentStartTime: selectedSlot.start || "",
        appointmentEndTime: selectedSlot.end || "",
        reason: reason || "General consultation",
        patientName,
        patientId,
        doctorType: doctor?.doctorType || "SP",
        doctorId,
        modeOfConsult: consultMode,
      });

      const appointmentMongoId  = response?.data?._id;
      const appointmentDisplayId = response?.data?.appointmentId;
      if (appointmentMongoId && email) {
        localStorage.setItem(`meradocAppointmentId_${email}`, appointmentMongoId);
      }

      setBookingResult({
        type: "success",
        mongoId:    appointmentMongoId,
        displayId:  appointmentDisplayId,
        message: `Your appointment with ${doctor?.name} has been booked for ${dateStr} at ${formatTime(selectedSlot.start)}.`,
      });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || "Something went wrong.";
      let errorMsg = msg;
      if (status === 409) errorMsg = "This slot is already booked. Choose another.";
      else if (status === 429) errorMsg = "You already have an upcoming appointment.";
      setBookingResult({ type: "error", message: errorMsg });
    }
  };

  // ─── Booking Result ───
  if (bookingResult) {
    return (
      <div className="drp-page">
        <div className="dd-result">
          <div className={`dd-result-icon ${bookingResult.type}`}>
            {bookingResult.type === "success" ? Icons.check : Icons.error}
          </div>
          <h2>{bookingResult.type === "success" ? "Booking Confirmed!" : "Booking Failed"}</h2>
          <p>{bookingResult.message}</p>
          {bookingResult.type === "success" && bookingResult.displayId && (
            <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "4px" }}>
              Appointment ID: <strong>{bookingResult.displayId}</strong>
            </p>
          )}
          <div className="dd-result-actions">
            {bookingResult.type === "success" && bookingResult.mongoId && (
              <Link href={`/consultancy/appointment/${bookingResult.mongoId}`} className="dd-btn-primary">
                View Appointment Details
              </Link>
            )}
            {bookingResult.type === "error" && (
              <button className="dd-btn-primary" onClick={() => { setBookingResult(null); setStep(1); }}>Try Again</button>
            )}
            <Link href="/doctors" className="dd-btn-secondary">Back to Doctors</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (docLoading || !isTokenReady) {
    return (
      <div className="drp-page">
        <div className="dd-loading">
          <div className="dd-spinner" />
          <p>Loading doctor details...</p>
        </div>
      </div>
    );
  }

  // ─── No Doctor Found ───
  if (!doctor) {
    return (
      <div className="drp-page">
        <div className="dd-empty">
          <h2>Doctor not found</h2>
          <p>We couldn&apos;t find a doctor with this ID.</p>
          <Link href="/doctors" className="dd-btn-primary">Browse Doctors</Link>
        </div>
      </div>
    );
  }

  // ─── Slot rendering helper ───
  const renderSlotGroup = (label, icon, slots) => {
    if (slots.length === 0) return null;
    return (
      <div className="dd-slot-group">
        <h4 className="dd-slot-group-label">{icon} {label} <span>({slots.length} slots)</span></h4>
        <div className="dd-slot-chips">
          {slots.map((slot) => (
            <button
              key={slot._id}
              className={`dd-slot-chip ${selectedSlot?._id === slot._id ? "active" : ""} ${slot.isBlocked || slot.isBooked ? "disabled" : ""}`}
              onClick={() => handleSlotSelect(slot)}
              disabled={slot.isBlocked || slot.isBooked}
            >
              {formatTime(slot.start)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="drp-page">
      {/* Header */}
      <div className="drp-header">
        <button className="drp-back" onClick={() => router.back()}>{Icons.back}</button>
        <h1>Doctor Details</h1>
      </div>

      {/* Doctor Info Card */}
      <div className="dd-doctor-card">
        <div className="dd-dc-avatar">
          {doctor.profileUrl ? (
            <img
              src={doctor.profileUrl}
              alt={doctor.name}
              className="dd-dc-avatar-img"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling.style.display = "flex";
              }}
            />
          ) : null}
          <svg
            width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"
            style={{ display: doctor.profileUrl ? "none" : "block" }}
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="dd-dc-info">
          <h2>{doctor.name}</h2>
          <p className="dd-dc-specialty">{doctor.specialty}</p>
          <p className="dd-dc-quals">{doctor.qualifications}</p>
          <div className="dd-dc-stats">
            <span>{doctor.experience} yrs exp</span>
            <span>•</span>
            <span>{doctor.consultationCount} consults</span>
            <span>•</span>
            <span className="dd-dc-lang">{Icons.language} {doctor.languages}</span>
          </div>
        </div>
        <div className="dd-dc-price">
          <span className="dd-dc-price-amount">₹{doctor.price}</span>
          <span className="dd-dc-price-label">per consult</span>
        </div>
      </div>

      {/* Step Progress */}
      <div className="dd-steps">
        <div className={`dd-step ${step >= 1 ? "active" : ""}`}><span>1</span> Select Slot</div>
        <div className="dd-step-line" />
        <div className={`dd-step ${step >= 2 ? "active" : ""}`}><span>2</span> Your Details</div>
        <div className="dd-step-line" />
        <div className={`dd-step ${step >= 3 ? "active" : ""}`}><span>3</span> Confirm</div>
      </div>

      {/* ─── STEP 1: Slot Picker ─── */}
      {step === 1 && (
        <div className="dd-section">
          <h3 className="dd-section-title">Select Date & Time</h3>

          {/* Date Chips */}
          <div className="dd-date-chips">
            {days.map((day) => (
              <button
                key={day.dateStr}
                className={`dd-date-chip ${dateStr === day.dateStr ? "active" : ""}`}
                onClick={() => handleDateSelect(day.dateStr)}
              >
                <span className="dd-date-day">{day.dayName}</span>
                <span className="dd-date-num">{day.dayNum} {day.month}</span>
              </button>
            ))}
          </div>

          {/* Slots */}
          {slotsLoading ? (
            <div className="dd-slots-loading">Loading available slots...</div>
          ) : allSlots.length === 0 ? (
            <div className="dd-slots-empty">No slots available for this date.</div>
          ) : (
            <div className="dd-slots-container">
              {renderSlotGroup("Morning", Icons.sun, groupedSlots.morning)}
              {renderSlotGroup("Afternoon", Icons.sunset, groupedSlots.afternoon)}
              {renderSlotGroup("Evening", Icons.moon, groupedSlots.evening)}
            </div>
          )}

          <button className="dd-btn-primary dd-btn-full" onClick={handleNext} disabled={!selectedSlot}>
            Continue
          </button>
        </div>
      )}

      {/* ─── STEP 2: Patient Details ─── */}
      {step === 2 && (
        <div className="dd-section">
          <h3 className="dd-section-title">Your Details</h3>
          <div className="dd-form">
            <label>
              Patient Name *
              <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Enter full name" />
            </label>
            <label>
              Phone Number *
              <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="Enter phone number" />
            </label>
            <label>
              Reason for Consultation
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe your concern briefly..." rows={3} />
            </label>
            <div className="dd-mode-toggle">
              <span>Consultation Mode:</span>
              <button className={`dd-mode-btn ${consultMode === "video" ? "active" : ""}`} onClick={() => setConsultMode("video")}>
                {Icons.video} Video
              </button>
              <button className={`dd-mode-btn ${consultMode === "audio" ? "active" : ""}`} onClick={() => setConsultMode("audio")}>
                {Icons.phone} Audio
              </button>
            </div>
          </div>
          <div className="dd-btn-row">
            <button className="dd-btn-secondary" onClick={handleBack}>Back</button>
            <button className="dd-btn-primary" onClick={handleNext} disabled={!patientName.trim() || !patientPhone.trim()}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Confirmation ─── */}
      {step === 3 && (
        <div className="dd-section">
          <h3 className="dd-section-title">Confirm Booking</h3>
          <div className="dd-confirmation">
            <div className="dd-confirm-row"><span>Doctor</span><strong>{doctor.name}</strong></div>
            <div className="dd-confirm-row"><span>Specialty</span><strong>{doctor.specialty}</strong></div>
            <div className="dd-confirm-row"><span>Date</span><strong>{dateStr}</strong></div>
            <div className="dd-confirm-row"><span>Time</span><strong>{formatTime(selectedSlot?.start)} - {formatTime(selectedSlot?.end)}</strong></div>
            <div className="dd-confirm-row"><span>Patient</span><strong>{patientName}</strong></div>
            <div className="dd-confirm-row"><span>Phone</span><strong>{patientPhone}</strong></div>
            <div className="dd-confirm-row"><span>Mode</span><strong>{consultMode === "video" ? "Video Call" : "Audio Call"}</strong></div>
            <div className="dd-confirm-row"><span>Fee</span><strong className="dd-price-highlight">₹{doctor.price}</strong></div>
            {reason && <div className="dd-confirm-row"><span>Reason</span><strong>{reason}</strong></div>}
          </div>
          <div className="dd-btn-row">
            <button className="dd-btn-secondary" onClick={handleBack}>Back</button>
            <button className="dd-btn-primary" onClick={handleBook} disabled={isBooking}>
              {isBooking ? "Booking..." : "Confirm & Book"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
