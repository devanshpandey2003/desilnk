export async function getPatientId() {
  const email = localStorage.getItem("userEmail");
  if (!email) return null;

  const cacheKey = `meradocPatientId_${email}`;

  // 1. Try localStorage cache first
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  // 2. Fall back to DB
  try {
    const res = await fetch(`/api/meradoc/patient?email=${encodeURIComponent(email)}`);
    const json = await res.json();
    if (json.patientId) {
      localStorage.setItem(cacheKey, json.patientId);
      return json.patientId;
    }
  } catch (err) {
    console.error("Failed to fetch patientId from DB:", err);
  }

  return null;
}
