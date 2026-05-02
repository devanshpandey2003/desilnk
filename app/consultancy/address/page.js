"use client";

import Link from "next/link";
import "../consultancy.css"; // Reuse styling

export default function AddressPage() {
  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Address Submitted!");
  };

  return (
    <div className="address-page">
      <div className="address-overlay"></div>
      
      <div className="address-card animate-fade-in">
        <h2>Submit delivery address</h2>

        <button className="btn-current-loc">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Use my current location
        </button>

        <p className="address-divider">Or enter address manually :</p>

        <form onSubmit={handleSubmit}>
          <div className="input-with-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              className="address-input" 
              placeholder="Search area, street, landmark..." 
              defaultValue="1777, near DCB Bank, Lower Parel, Friends Colony, Kurla West, Kurla, Mumbai, Maharashtra 400070, India"
            />
          </div>

          <select className="address-select">
            <option value="">Select address from suggestions</option>
            <option value="1">Home - 1777, near DCB Bank</option>
            <option value="2">Office - BKC</option>
          </select>

          <button type="submit" className="btn-submit">
            Submit Address
          </button>
        </form>
      </div>
    </div>
  );
}
