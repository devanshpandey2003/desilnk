"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import "../medicines.css";
import "./prescription.css";

export default function PrescriptionPage() {
  const router  = useRouter();
  const fileRef = useRef(null);
  const [files,    setFiles]    = useState([]);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming) => {
    const allowed = Array.from(incoming).filter(f =>
      ["image/jpeg","image/png","image/jpg","application/pdf"].includes(f.type)
    );
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...allowed.filter(f => !existing.has(f.name))];
    });
  };

  const removeFile = (name) => setFiles(prev => prev.filter(f => f.name !== name));

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleProceed = () => {
    // Store prescription file names in localStorage for cart to pick up
    const meta = files.map(f => ({ fileName: f.name, fileType: f.type, size: f.size }));
    localStorage.setItem("medPrescriptions", JSON.stringify(meta));
    // Store actual files via sessionStorage isn't possible for File objects;
    // cart page will show prescription names and handle upload at order time
    router.push("/consultancy/medicines");
  };

  return (
    <div className="rx-page">
      <div className="rx-inner">
        <button className="rx-back" onClick={() => router.back()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>

        <h1 className="rx-title">Upload Prescription</h1>
        <p className="rx-sub">Upload a valid prescription from your doctor to order Rx medicines</p>

        {/* Drop zone */}
        <div
          className={`rx-dropzone ${dragging ? "rx-dropzone-active" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            multiple
            style={{ display: "none" }}
            onChange={e => addFiles(e.target.files)}
          />
          <div className="rx-drop-icon">📋</div>
          <p className="rx-drop-label">Drag & drop or <span className="rx-drop-link">browse files</span></p>
          <p className="rx-drop-hint">Supports JPG, PNG, PDF · Max 5 files</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="rx-file-list">
            {files.map(f => (
              <div key={f.name} className="rx-file-item">
                <span className="rx-file-icon">{f.type === "application/pdf" ? "📄" : "🖼️"}</span>
                <div className="rx-file-info">
                  <p className="rx-file-name">{f.name}</p>
                  <p className="rx-file-size">{(f.size / 1024).toFixed(1)} KB</p>
                </div>
                <button className="rx-file-remove" onClick={() => removeFile(f.name)}>✕</button>
              </div>
            ))}
          </div>
        )}

        <div className="rx-tips">
          <p className="rx-tips-title">📌 Tips for a valid prescription</p>
          <ul>
            <li>Doctor&apos;s name, signature and registration number should be visible</li>
            <li>Patient name and date should be clearly mentioned</li>
            <li>Prescription should not be older than 6 months</li>
            <li>Image should be clear and not blurry</li>
          </ul>
        </div>

        <button
          className="rx-btn-proceed"
          disabled={files.length === 0}
          onClick={handleProceed}
        >
          Continue to Search Medicines →
        </button>
      </div>
    </div>
  );
}
