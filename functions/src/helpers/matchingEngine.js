const { db, FieldValue } = require('../config');
const { COLLECTIONS, URGENCY_WEIGHT, REQUIREMENT_STATUS, DONATION_STATUS } = require('../constants');

/**
 * Runs the requirements-matching engine for an approved donation document.
 * Filters requirements by category and status, drops expired requirements in JS,
 * sorts candidates by priority weights -> expiry sensitive -> deadline, logs matches,
 * and updates donation states.
 */
async function runMatchingEngine(donationId) {
  // 1. Get donation details — throw if missing
  const donationSnap = await db.collection(COLLECTIONS.DONATIONS).doc(donationId).get();
  if (!donationSnap.exists) {
    throw new Error(`Donation ${donationId} not found`);
  }
  const donation = donationSnap.data();
  const now = new Date();

  // 2. Query open matching requirements
  const reqSnap = await db.collection(COLLECTIONS.NGO_REQUIREMENTS)
    .where('category', '==', donation.category)
    .where('status', 'in', [REQUIREMENT_STATUS.OPEN, REQUIREMENT_STATUS.PARTIALLY_FULFILLED])
    .get();

  if (reqSnap.empty) {
    console.log(`[matchingEngine] No matching requirements found for category: ${donation.category}`);
    return null;
  }

  // 3. Filter out expired requirements
  const candidates = reqSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((r) => {
      if (r.deliveryDeadline) {
        const deadline = r.deliveryDeadline.toDate ? r.deliveryDeadline.toDate() : new Date(r.deliveryDeadline);
        if (deadline <= now) return false;
      }
      if (r.expirySensitive && r.expiryDate) {
        const expiry = r.expiryDate.toDate ? r.expiryDate.toDate() : new Date(r.expiryDate);
        if (expiry <= now) return false;
      }
      return true;
    });

  if (candidates.length === 0) {
    console.log('[matchingEngine] All matching requirements are expired or passed deadlines.');
    return null;
  }

  // 4. Sort candidates: urgency weight (high first) -> expirySensitive -> deliveryDeadline (soonest first)
  candidates.sort((a, b) => {
    const weightA = URGENCY_WEIGHT[a.urgencyLevel] || 1;
    const weightB = URGENCY_WEIGHT[b.urgencyLevel] || 1;
    if (weightA !== weightB) {
      return weightB - weightA; // Descending (high priority first)
    }

    if (a.expirySensitive && !b.expirySensitive) return -1;
    if (!a.expirySensitive && b.expirySensitive) return 1;

    const deadA = a.deliveryDeadline ? (a.deliveryDeadline.toDate ? a.deliveryDeadline.toDate() : new Date(a.deliveryDeadline)) : new Date(9e15);
    const deadB = b.deliveryDeadline ? (b.deliveryDeadline.toDate ? b.deliveryDeadline.toDate() : new Date(b.deliveryDeadline)) : new Date(9e15);
    return deadA - deadB; // Ascending (soonest first)
  });

  const bestMatch = candidates[0];

  // 5. Create audit Match Log document
  await db.collection(COLLECTIONS.MATCHES).add({
    donationId,
    ngoId: bestMatch.ngoId,
    requirementId: bestMatch.id,
    category: donation.category,
    urgencyLevel: bestMatch.urgencyLevel,
    expirySensitive: bestMatch.expirySensitive || false,
    matchedAt: FieldValue.serverTimestamp(),
  });

  // 6. Update Donation document with matched tags and assign status
  await db.collection(COLLECTIONS.DONATIONS).doc(donationId).update({
    matchedNgoId: bestMatch.ngoId,
    matchedRequirementId: bestMatch.id,
    status: DONATION_STATUS.ASSIGNED,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[matchingEngine] Successfully matched Donation ${donationId} with NGO Requirement ${bestMatch.id}.`);
  return { ngoId: bestMatch.ngoId, requirementId: bestMatch.id };
}

module.exports = {
  runMatchingEngine,
};
