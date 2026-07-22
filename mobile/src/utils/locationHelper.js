// ─── locationHelper.js (Mobile App) ─────────────────────────────────────────
// FIX SUMMARY (getGeneralArea):
//  The old implementation only checked `location.address`.  It silently
//  returned "Unknown area" for:
//    • String locations  (donor typed a plain string)
//    • Objects with only `.area`  (privacy-stripped by Cloud Function)
//    • Objects from the new buildDonorLocation() fallback  (has `.area`)
//
//  The updated version works through a priority chain so the volunteer card
//  always shows something meaningful.
// ────────────────────────────────────────────────────────────────────────────

import * as Location from 'expo-location';

/**
 * Request location permissions and get current position
 * @returns {Promise<{location: object|null, error: string|null}>}
 */
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { location: null, error: 'Location permission denied' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;

    // Reverse geocode to get address
    const [geocoded] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    const address = geocoded
      ? [geocoded.name, geocoded.street, geocoded.city, geocoded.region, geocoded.postalCode]
          .filter(Boolean)
          .join(', ')
      : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    return {
      location: {
        lat: latitude,
        lng: longitude,
        address,
      },
      error: null,
    };
  } catch (error) {
    return { location: null, error: error.message };
  }
};

/**
 * Format a location object for display
 */
export const formatLocation = (location) => {
  if (!location) return 'No location';
  if (location.address) return location.address;
  if (location.lat && location.lng) {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }
  return 'Unknown location';
};


/**
 * Extract a human-readable area description from any location shape
 * that may be stored on a pickup_tasks document.
 *
 * Handles all known location shapes produced by this app:
 *
 *  Shape A – Plain string (donor typed free text)
 *    "123 Main St, Mumbai" → "123 Main St, Mumbai"
 *
 *  Shape B – Privacy-stripped object (Cloud Function strips lat/lng)
 *    { area: "Banjara Hills, Hyderabad" } → "Banjara Hills, Hyderabad"
 *
 *  Shape C – Full address object from GPS auto-detect
 *    { latitude: 17.3, longitude: 78.4, address: "Plot 5, Road 2…", city: "Hyderabad" }
 *    → "Hyderabad"  (city is most compact)
 *    → "Plot 5, Road 2…"  (falls back to full address if no city)
 *
 *  Shape D – Fallback object from buildDonorLocation() in DonationDetailModal
 *    { area: "Sector 7, Delhi" }  → "Sector 7, Delhi"
 *
 *  Shape E – Completely empty / null  → "Unknown area"
 *
 * @param {string|Object|null|undefined} location
 * @returns {string}
 */
export function getGeneralArea(location) {
  // ── Shape E: nothing to work with ────────────────────────────────────────
  if (!location) return "Unknown area";

  // ── Shape A: plain string ─────────────────────────────────────────────────
  // e.g. donor typed "Near Charminar, Hyderabad" and the field was stored as-is
  if (typeof location === "string") {
    return location.trim() || "Unknown area";
  }

  // ── Shape B / D: object with `.area` (privacy-stripped or fallback) ───────
  // Cloud Functions strip lat/lng and promote the geocoded area into `.area`.
  // DonationDetailModal.buildDonorLocation() also uses `.area` as the fallback key.
  if (location.area && typeof location.area === "string") {
    return location.area.trim() || "Unknown area";
  }

  // ── Shape C: full GPS object ───────────────────────────────────────────────
  // Prefer the compact `city` field if available, otherwise use the full address.
  if (location.city && typeof location.city === "string") {
    return location.city.trim() || "Unknown area";
  }

  if (location.address && typeof location.address === "string") {
    // The full address can be long; return the first segment before a comma
    // so the card doesn't overflow (e.g. "Plot 12, Road 5, Banjara Hills" → "Plot 12")
    // If you'd rather show the full string, remove the split.
    const firstPart = location.address.split(",")[0].trim();
    return firstPart || location.address.trim() || "Unknown area";
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return "Unknown area";
}

/**
 * Format a scheduledDate value from a Firestore task document.
 *
 * The field may be:
 *   • a Firestore Timestamp object  → convert via .toDate()
 *   • a JS Date                     → format directly
 *   • an ISO string                 → parse then format
 *   • null / undefined              → return "Not scheduled"
 *
 * @param {import('firebase/firestore').Timestamp|Date|string|null|undefined} scheduledDate
 * @returns {string}
 */
export function formatScheduledDate(scheduledDate) {
  if (!scheduledDate) return "Not scheduled";

  let date;

  // Firestore Timestamp
  if (scheduledDate && typeof scheduledDate.toDate === "function") {
    date = scheduledDate.toDate();
  } else if (scheduledDate instanceof Date) {
    date = scheduledDate;
  } else if (typeof scheduledDate === "string") {
    date = new Date(scheduledDate);
  } else {
    return "Not scheduled";
  }

  if (isNaN(date.getTime())) return "Not scheduled";

  return date.toLocaleDateString("en-IN", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

/**
 * Build donor initials from a name string.
 * Returns "??" when name is absent or empty (matches existing UI expectation).
 *
 * @param {string|null|undefined} name
 * @returns {string}  e.g. "RK", "A", "??"
 */
export function getDonorInitials(name) {
  if (!name || typeof name !== "string") return "??";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";

  if (parts.length === 1) {
    // Single-word name → first two chars uppercased
    return parts[0].substring(0, 2).toUpperCase();
  }

  // First letter of first and last word
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── NEW HELPERS ────────────────────────────────────────────────────────────

/**
 * Format a structured address object into a human-readable string.
 * @param {Object|string} addressObj - { street, area, city, state, pincode } or plain string
 * @returns {string}
 */
export function formatFullAddress(addressObj) {
  if (!addressObj) return 'Address not available';
  if (typeof addressObj === 'string') return addressObj;
  return [
    addressObj.street,
    addressObj.area,
    addressObj.city,
    addressObj.state,
    addressObj.pincode,
  ]
    .filter(Boolean)
    .join(', ') || 'Address not available';
}

/**
 * Build a Google Maps search URL from an address string or object.
 * @param {Object|string} address
 * @returns {string|null}
 */
export function buildGoogleMapsUrl(address) {
  const formatted = formatFullAddress(address);
  if (!formatted || formatted === 'Address not available') return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatted)}`;
}
