"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Stagger, StaggerItem, AnimatedNumber } from "@/components/motion";
import "./medicines.css";

const fmtRupees2 = (n) => `₹${n.toFixed(2)}`;
const fmtCount = (n) => `${Math.round(n)}`;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function MedicinesPage() {
  const router = useRouter();
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [cart,     setCart]     = useState([]);  // [{ product, qty }]
  const [pincode,  setPincode]  = useState("");
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 500);

  // Load pincode from saved address
  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "";
    const loc = (() => { try { return JSON.parse(localStorage.getItem(`ltLocation_${email}`) || "null") || {}; } catch { return {}; } })();
    if (loc.pincode) setPincode(loc.pincode);
    // Also try DB
    if (email && !loc.pincode) {
      fetch(`/api/lab-test-address?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(j => { if (j.location?.pincode) setPincode(j.location.pincode); })
        .catch(() => {});
    }
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setResults([]); setSearched(false); return;
    }
    setLoading(true); setSearched(true);
    fetch(`/api/medicine/search?search=${encodeURIComponent(debouncedQuery)}&pincode=${pincode || "400001"}&size=20`)
      .then(r => r.json())
      .then(j => setResults(j?.data?.list || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, pincode]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + (parseFloat(i.product.pricingInfo?.discountedMrp || i.product.pricingInfo?.mrp || 0) * i.qty), 0);
  const hasRx = cart.some(i => i.product.additonalInfo?.isRxRequired);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.productId === product.productId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prev, { product, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((productId, delta) => {
    setCart(prev => {
      const updated = prev.map(i => i.product.productId === productId ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0);
      return updated;
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(i => i.product.productId !== productId));
  }, []);

  const getCartQty = (productId) => cart.find(i => i.product.productId === productId)?.qty || 0;

  const handleCheckout = () => {
    localStorage.setItem("medCart", JSON.stringify(cart));
    router.push("/consultancy/cart?tab=medicines");
  };

  return (
    <div className="med-page">
      {/* Hero + Search */}
      <div className="med-hero">
        <h1>Order Medicines Online</h1>
        <p>Get authentic medicines delivered to your doorstep with trusted service</p>
        <div className="med-search-wrap">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="med-search-input"
            type="text"
            placeholder="Search medicines, brands, or symptoms"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Action cards */}
      {!searched && (
        <Stagger className="med-features">
          <StaggerItem className="med-feature-item">
            <button className="med-feature-card med-feature-btn" onClick={() => router.push("/consultancy/medicines/prescription")}>
              <div className="med-feature-icon" style={{ background: "#dbeafe" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a4fd4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h4>Upload</h4>
              <p>Prescription</p>
            </button>
          </StaggerItem>

          <StaggerItem className="med-feature-item">
            <a className="med-feature-card med-feature-btn" href="tel:+918069991444">
              <div className="med-feature-icon" style={{ background: "#ffedd5" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <h4>Call to</h4>
              <p>Order</p>
            </a>
          </StaggerItem>

          <StaggerItem className="med-feature-item">
            <button className="med-feature-card med-feature-btn" onClick={() => router.push("/consultancy/concerns")}>
              <div className="med-feature-icon" style={{ background: "#dcfce7" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <h4>Consult</h4>
              <p>Doctor</p>
            </button>
          </StaggerItem>

          <StaggerItem className="med-feature-item">
            <div className="med-feature-card">
              <div className="med-feature-icon" style={{ background: "#ede9fe" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h4>10 mins</h4>
              <p>Delivery</p>
            </div>
          </StaggerItem>
        </Stagger>
      )}

      {/* Results + Cart */}
      {searched && (
        <div className="med-content">
          {/* Results */}
          <div className="med-results-section">
            {loading ? (
              <div className="med-results-list">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="med-card">
                    <div className="skeleton med-skeleton-img" />
                    <div className="med-card-body">
                      <div className="skeleton skeleton-text" style={{ width: "70%", marginBottom: "0.4rem" }} />
                      <div className="skeleton skeleton-text" style={{ width: "40%", marginBottom: "0.4rem" }} />
                      <div className="skeleton skeleton-text" style={{ width: "55%", marginBottom: "0.6rem" }} />
                      <div className="skeleton skeleton-text" style={{ width: "30%" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="med-empty">
                <div className="med-empty-icon">💊</div>
                <p>No medicines found for &quot;{query}&quot;</p>
                <p style={{ fontSize: "0.8rem" }}>Try a different name or brand</p>
              </div>
            ) : (
              <>
                <h2>{results.length} result{results.length !== 1 ? "s" : ""} for &quot;{query}&quot;</h2>
                <div className="med-results-list">
                  {results.map(product => {
                    const qty       = getCartQty(product.productId);
                    const inStock   = product.fulfilability?.productFulfilability === "IN_STOCK";
                    const isRx      = product.additonalInfo?.isRxRequired;
                    const mrp       = product.pricingInfo?.mrp;
                    const discounted = product.pricingInfo?.discountedMrp;
                    const discount  = product.pricingInfo?.discountedpercentage;
                    const img       = product.productImage?.find(i => i.face === "front")?.url || product.productImage?.[0]?.url;

                    return (
                      <div key={product.productId} className="med-card">
                        {img ? (
                          <img src={img} alt={product.name} className="med-card-img" />
                        ) : (
                          <div className="med-card-img-placeholder">💊</div>
                        )}
                        <div className="med-card-body">
                          <p className="med-card-name">{product.name}</p>
                          <p className="med-card-mfr">{product.manufacturerInfo?.name}</p>
                          <p className="med-card-composition">{product.moleculeInfo?.composition}</p>
                          <div className="med-card-badges">
                            <span className={`med-badge ${inStock ? "med-badge-stock" : "med-badge-nostock"}`}>
                              {inStock ? "In Stock" : "Out of Stock"}
                            </span>
                            {isRx && <span className="med-badge med-badge-rx">Rx Required</span>}
                          </div>
                          <div className="med-card-footer">
                            <div className="med-price-wrap">
                              <span className="med-price">₹{discounted ?? mrp}</span>
                              {discounted && mrp && discounted < mrp && (
                                <>
                                  <span className="med-mrp">₹{mrp}</span>
                                  {discount && <span className="med-discount">{discount}% off</span>}
                                </>
                              )}
                            </div>
                            {qty === 0 ? (
                              <button className="med-btn-add" disabled={!inStock} onClick={() => addToCart(product)}>
                                {inStock ? "Add to Cart" : "Unavailable"}
                              </button>
                            ) : (
                              <div className="med-qty-ctrl">
                                <button className="med-qty-btn" onClick={() => updateQty(product.productId, -1)}>−</button>
                                <span className="med-qty-num">{qty}</span>
                                <button className="med-qty-btn" onClick={() => updateQty(product.productId, +1)}>+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Cart panel */}
          <div className="med-cart-panel">
            <h3>
              🛒 My Cart
              {cartCount > 0 && <span className="med-cart-count"><AnimatedNumber value={cartCount} format={fmtCount} /></span>}
            </h3>
            {cart.length === 0 ? (
              <p className="med-cart-empty">Your cart is empty.<br/>Add medicines to get started.</p>
            ) : (
              <>
                {cart.map(({ product, qty }) => (
                  <div key={product.productId} className="med-cart-item">
                    <div style={{ flex: 1 }}>
                      <p className="med-cart-item-name">{product.name}</p>
                      {product.additonalInfo?.isRxRequired && (
                        <span className="med-cart-item-rx">Rx Required</span>
                      )}
                      <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "2px 0 0" }}>
                        {qty} × ₹{product.pricingInfo?.discountedMrp ?? product.pricingInfo?.mrp}
                      </p>
                    </div>
                    <span className="med-cart-item-price">
                      ₹{(parseFloat(product.pricingInfo?.discountedMrp || product.pricingInfo?.mrp || 0) * qty).toFixed(2)}
                    </span>
                    <button className="med-cart-remove" onClick={() => removeFromCart(product.productId)}>✕</button>
                  </div>
                ))}
                <hr className="med-cart-divider" />
                <div className="med-cart-total">
                  <span>Total</span>
                  <span><AnimatedNumber value={cartTotal} format={fmtRupees2} /></span>
                </div>
                {hasRx && (
                  <p className="med-cart-rx-notice">
                    📋 One or more items require a prescription. You&apos;ll need to upload it at checkout.
                  </p>
                )}
                <button className="med-btn-checkout" onClick={handleCheckout}>
                  Proceed to Checkout →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile floating cart button */}
      {cartCount > 0 && (
        <button className="med-cart-fab" onClick={handleCheckout}>
          🛒 <AnimatedNumber value={cartCount} format={fmtCount} /> item{cartCount !== 1 ? "s" : ""} · <AnimatedNumber value={cartTotal} format={fmtRupees2} /> → Checkout
        </button>
      )}
    </div>
  );
}
