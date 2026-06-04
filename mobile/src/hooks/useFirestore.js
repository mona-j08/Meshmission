// ─── useFirestore.js (Admin Panel hook) ─────────────────────────────────────
// FIX SUMMARY (createOpenPickupTask):
//  1. Write `donationIds: [donationId]` (array) alongside `donationId` (string)
//     for backward-compat.  Mobile schema expects the array key.
//  2. Write `donorName` — sourced from DonationDetailModal which fetches it.
//  3. Write `pickupPreference` — carried over from the donation document.
//  4. Write `donorLocation` — built by DonationDetailModal with address fallback.
//  5. Write `scheduledDate: null` explicitly so the mobile UI can distinguish
//     "not yet scheduled" from "field missing entirely".
// ────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase"; // adjust path if needed

export function useFirestore() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // ── createOpenPickupTask ──────────────────────────────────────────────────
  /**
   * Creates a pickup_tasks document that is fully populated for the volunteer
   * mobile app.  All previously-missing fields are now written here.
   *
   * @param {Object} taskData
   * @param {string}      taskData.donationId        - The donation doc ID
   * @param {string}      taskData.donorId           - UID of the donor
   * @param {string}      taskData.donorName         - Display name (NEW)
   * @param {Object|null} taskData.donorLocation     - Location with fallback (FIXED)
   * @param {string|null} taskData.pickupPreference  - e.g. "Morning", "Evening" (NEW)
   * @param {string}      taskData.matchedNgoId      - UID of the matched NGO
   * @param {string}      taskData.category          - Donation category
   * @param {string}      taskData.description       - Item description
   * @param {string[]}    taskData.imageUrls         - Array of image URLs
   */
  async function createOpenPickupTask(taskData) {
    setLoading(true);
    setError(null);

    try {
      const {
        donationId,
        donorId,
        donorName,        // FIX 2 – now received from modal
        donorLocation,    // FIX 4 – now received from modal (with address fallback)
        pickupPreference, // FIX 3 – now received from modal
        matchedNgoId,
        category,
        description,
        imageUrls,
      } = taskData;

      const taskDoc = {
        // ── Core identifiers ─────────────────────────────────────────────
        donorId,
        matchedNgoId,

        // ── FIX 1: Write BOTH the string and array forms ──────────────────
        // The mobile app's task schema expects `donationIds` (array) for
        // queries and rendering.  We keep `donationId` (string) alongside it
        // so any existing code that reads the old key doesn't break.
        donationId,                          // backward-compat string
        donationIds: [donationId],           // ← NEW – what the mobile schema wants

        // ── FIX 2: Donor display name → volunteer card initials ───────────
        // Previously omitted, causing "??" to appear on TaskCard.
        donorName: donorName || "Unknown Donor",

        // ── FIX 4: Donor location with address fallback ───────────────────
        // DonationDetailModal.buildDonorLocation() ensures this is never null
        // when the donor typed an address, giving getGeneralArea() real data.
        donorLocation: donorLocation || null,

        // ── FIX 3: Pickup preference → volunteer detail screen ────────────
        // Donor's preferred time window (e.g. "Morning", "Weekend only").
        // Previously dropped on the floor; now persisted to Firestore.
        pickupPreference: pickupPreference || null,

        // ── FIX 5: scheduledDate written explicitly ────────────────────────
        // Writing null lets the mobile UI distinguish "not yet scheduled"
        // from "field simply missing", preventing "No date set" falling
        // through on old documents.
        scheduledDate: null,

        // ── Donation details (unchanged) ──────────────────────────────────
        category:    category    || "General",
        description: description || "",
        imageUrls:   imageUrls   || [],

        // ── Task lifecycle fields (unchanged) ─────────────────────────────
        status:      "open",
        volunteerId: null,        // set when a volunteer accepts
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      };

      const taskRef = await addDoc(collection(db, "pickup_tasks"), taskDoc);

      // Optionally: return the new task ID so the caller can link it back to
      // the donation document (donation.pickupTaskId).
      return taskRef.id;
    } catch (err) {
      console.error("createOpenPickupTask failed:", err);
      setError(err.message);
      throw err; // re-throw so the modal's catch block can surface it
    } finally {
      setLoading(false);
    }
  }

  // ── approveDonation ───────────────────────────────────────────────────────
  /**
   * Marks a donation as approved and links it to the matched NGO.
   * Also stamps the pickupTaskId back onto the donation document once the
   * task has been created so Firestore rules can resolve the volunteer link.
   */
  async function approveDonation(donationId, matchedNgoId, pickupTaskId) {
    setLoading(true);
    setError(null);

    try {
      const donationRef = doc(db, "donations", donationId);
      await updateDoc(donationRef, {
        status:       "approved",
        matchedNgoId,
        pickupTaskId: pickupTaskId || null, // link for Firestore rule resolution
        updatedAt:    serverTimestamp(),
      });
    } catch (err) {
      console.error("approveDonation failed:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // ── Additional hook methods (your existing ones go here unchanged) ─────────
  // e.g. fetchDonations, fetchNgos, updateTaskStatus, etc.

  return {
    loading,
    error,
    createOpenPickupTask,
    approveDonation,
  };
}
