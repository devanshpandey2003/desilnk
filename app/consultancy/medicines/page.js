"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./medicines.css";

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
    router.push("/consultancy/medicines/cart");
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

      {/* Feature cards */}
      {!searched && (
        <div className="med-features">
          {[
            { icon: "🛡️", color: "#dcfce7", label: "100% Authentic", sub: "All medicines sourced from verified suppliers" },
            { icon: "🚚", color: "#dbeafe", label: "Express Delivery", sub: "Timely delivered to your doorstep" },
            { icon: "💰", color: "#ede9fe", label: "Great Discounts", sub: "Save on recurring medicine bill" },
            { icon: "🔒", color: "#ffedd5", label: "Secure Payments", sub: "Safe and encrypted transactions" },
          ].map(f => (
            <div key={f.label} className="med-feature-card">
              <div className="med-feature-icon" style={{ background: f.color }}>{f.icon}</div>
              <h4>{f.label}</h4>
              <p>{f.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results + Cart */}
      {searched && (
        <div className="med-content">
          {/* Results */}
          <div className="med-results-section">
            {loading ? (
              <div className="med-spinner" />
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
              {cartCount > 0 && <span className="med-cart-count">{cartCount}</span>}
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
                  <span>₹{cartTotal.toFixed(2)}</span>
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
          🛒 {cartCount} item{cartCount !== 1 ? "s" : ""} · ₹{cartTotal.toFixed(2)} → Checkout
        </button>
      )}
    </div>
  );
}
