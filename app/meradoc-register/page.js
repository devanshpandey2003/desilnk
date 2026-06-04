"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserService } from "../../services/user.service";
import "./meradoc-register.css";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS  = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);

function calcAge(month, day, year) {
  const birth = new Date(year, MONTHS.indexOf(month), day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function MeraDocRegisterPage() {
  const router = useRouter();

  const [email,   setEmail]   = useState("");
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [gender,  setGender]  = useState("");
  const [month,   setMonth]   = useState("Jan");
  const [day,     setDay]     = useState("1");
  const [year,    setYear]    = useState(String(new Date().getFullYear() - 25));
  const [pincode, setPincode] = useState("");
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem("userEmail") || "";
    const savedName  = localStorage.getItem("userName")  || "";
    const savedPhone = localStorage.getItem("userPhone") || "";
    setEmail(savedEmail);
    setName(savedName);
    setPhone(savedPhone.replace(/^\+\d+\s?/, ""));

    if (!savedEmail) return;

    // 1. Check localStorage cache first — fastest path
    const cachedPid = localStorage.getItem(`meradocPatientId_${savedEmail}`);
    if (cachedPid) { router.replace("/consultancy"); return; }

    // 2. Check DB
    fetch(`/api/meradoc/patient?email=${encodeURIComponent(savedEmail)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.patientId) {
          localStorage.setItem(`meradocPatientId_${savedEmail}`, json.patientId);
          router.replace("/consultancy");
        }
      })
      .catch(() => {});
  }, [router]);

  const isValid =
    email.trim() && /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/.test(email.trim()) &&
    name.trim() && phone.trim().length >= 10 &&
    gender && pincode.length === 6 && agreed;

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    try {
      await UserService.generateToken();

      const emailVal   = email.trim();
      const patientKey = emailVal ? `meradocPatientId_${emailVal}` : null;

      // ── Step 1: Check if this email already has a patient in our DB ──
      if (emailVal) {
        const checkRes  = await fetch(`/api/meradoc/patient?email=${encodeURIComponent(emailVal)}`);
        const checkJson = await checkRes.json();
        if (checkJson.patientId) {
          // Existing user — restore session and skip registration
          localStorage.setItem("userEmail", emailVal);
          if (patientKey) localStorage.setItem(patientKey, checkJson.patientId);
          router.push("/consultancy");
          return;
        }
      }

      // ── Step 2: New user — register them ──
      const age = calcAge(month, day, parseInt(year));

      const response = await UserService.registerPatient({
        name:                  name.trim(),
        emailId:               emailVal,
        mobileNumber:          phone.trim(),
        age:                   age > 0 ? age : null,
        gender,
        addressDetails:        "",
        addressLine2:          "",
        city:                  "",
        district:              "",
        pincode:               pincode.trim(),
        state:                 "",
        country:               localStorage.getItem("userCountry") || "",
        externalCorporateName: "PPP",
      });

      const patientId = response?.data?._id;
      if (patientId) {
        localStorage.setItem("userEmail", emailVal);
        localStorage.setItem("userGender", gender);
        // Save patientId to DB
        await fetch("/api/meradoc/patient", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal, patientId }),
        });
        // Save DOB + gender to users table
        const monthIndex = String(MONTHS.indexOf(month) + 1).padStart(2, "0");
        const dayPadded  = String(day).padStart(2, "0");
        const dobStr     = `${year}-${monthIndex}-${dayPadded}`;
        await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal, dob: dobStr, gender }),
        });
        if (patientKey) localStorage.setItem(patientKey, patientId);
      }

      router.push("/consultancy");
    } catch (err) {
      const errData = err?.response?.data;
      console.error("MeraDoc registration failed:", errData || err.message);

      const emailVal   = email.trim();
      const patientKey = emailVal ? `meradocPatientId_${emailVal}` : null;

      // MeraDoc returns existing patient in error body when email already exists
      const existingId =
        errData?.data?._id   || errData?.data?.id   ||
        errData?._id         || errData?.id          ||
        errData?.patientId   || errData?.data?.patientId;

      if (existingId) {
        await fetch("/api/meradoc/patient", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailVal, patientId: existingId }),
        });
        if (patientKey) localStorage.setItem(patientKey, existingId);
        router.push("/consultancy");
        return;
      }

      // If error says email already exists but no ID returned, check DB one more time
      // (another tab/device may have registered successfully)
      const errMsg = (errData?.message || errData?.error || err.message || "").toLowerCase();
      if (errMsg.includes("already") || errMsg.includes("exist") || errMsg.includes("duplicate")) {
        try {
          const recheck = await fetch(`/api/meradoc/patient?email=${encodeURIComponent(emailVal)}`);
          const { patientId: recheckPid } = await recheck.json();
          if (recheckPid) {
            if (patientKey) localStorage.setItem(patientKey, recheckPid);
            router.push("/consultancy");
            return;
          }
        } catch {}
        setError("Your account already exists in MeraDoc but we couldn't link it automatically. Please contact support.");
        return;
      }

      setError(errData?.message || errData?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mr-layout">
      {/* ── Left panel ── */}
      <div className="mr-left">
        <h1>Your Health,<br />Our Priority</h1>
        <p>Join thousands of families who trust us for their healthcare journey. Get personalized care from certified professionals.</p>

        <ul className="mr-features">
          <li>
            <span className="mr-feature-icon">🔒</span>
            100% Secure &amp; Confidential
          </li>
          <li>
            <span className="mr-feature-icon">🎧</span>
            24/7 Health Support
          </li>
          <li>
            <span className="mr-feature-icon">💙</span>
            Personalized Care Plans
          </li>
        </ul>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="mr-right">
        <p className="mr-subtitle">Start your personalized health journey today</p>

        {/* Email */}
        <div className="mr-field">
          <label>✉️ Email Address*</label>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="mr-field-hint">Already registered? Enter your email to continue where you left off.</p>
        </div>

        {/* Full Name */}
        <div className="mr-field">
          <label>👤 Full Name*</label>
          <input
            type="text"
            value={name}
            readOnly
            style={{ background: "#f5f7fa", cursor: "not-allowed", color: "#6b7280" }}
          />
        </div>

        {/* Phone */}
        <div className="mr-field">
          <label>📞 Phone Number*</label>
          <input
            type="tel"
            value={phone}
            readOnly
            style={{ background: "#f5f7fa", cursor: "not-allowed", color: "#6b7280" }}
          />
        </div>

        {/* Gender */}
        <div className="mr-field">
          <label>Gender*</label>
          <div className="mr-gender-row">
            {["Male", "Female", "Others"].map((g) => (
              <label key={g} className={`mr-gender-option ${gender === g ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={gender === g}
                  onChange={() => setGender(g)}
                />
                {g}
              </label>
            ))}
          </div>
        </div>

        {/* Date of Birth */}
        <div className="mr-field">
          <label>📅 Date of Birth*</label>
          <div className="mr-dob-row">
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <select value={day} onChange={(e) => setDay(e.target.value)}>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Pincode */}
        <div className="mr-field">
          <label>📍 Pincode*</label>
          <input
            type="text"
            placeholder="Enter 6-digit pincode"
            maxLength={6}
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        {/* Terms */}
        <label className="mr-terms">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          I agree to the <a href="#">Terms &amp; Conditions</a> and <a href="#">Privacy Policy</a>
        </label>

        {error && <p className="mr-error">{error}</p>}

        {/* Submit */}
        <button
          className="mr-submit"
          disabled={!isValid || loading}
          onClick={handleSignUp}
        >
          {loading ? "Please wait..." : "Sign Up"}
        </button>
      </div>
    </div>
  );
}
