// Client-side session helper: run on every login / registration success so a
// new user never inherits the previous user's delivery city or cart, and a
// returning user's saved address is restored from the server.
//
// The full address is persisted server-side in user_lt_locations and fetched
// via GET /api/lab-test-address?email=, so clearing cross-user localStorage
// loses nothing — it re-hydrates below.
export async function activateUser(email) {
  if (typeof window === "undefined" || !email) return;

  // Clear leaky/global keys that were never per-user (source of the cross-user leak).
  localStorage.removeItem("ltCart");          // cart is cleared on user switch
  localStorage.removeItem("ltLocation");      // legacy global address key
  localStorage.removeItem("ltDeliveryCity");  // header now derives city per-user

  // Restore this user's saved address from the server if we don't have it locally.
  const key = `ltLocation_${email}`;
  if (!localStorage.getItem(key)) {
    try {
      const res = await fetch(`/api/lab-test-address?email=${encodeURIComponent(email)}`);
      const { location } = await res.json();
      if (location) localStorage.setItem(key, JSON.stringify(location));
    } catch {
      // Non-fatal: address stays empty ("Set address"); still safe in DB/MeraDoc.
    }
  }

  // Refresh the nav header (delivery city + cart count).
  window.dispatchEvent(new Event("lt-nav-update"));
}
