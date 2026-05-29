import { URGENCY, URGENCY_ORDER } from '../constants/urgency';

/**
 * Sort NGO requirements by urgency level (emergency first)
 * Within same urgency, sort by delivery deadline (soonest first)
 */
export const sortByUrgency = (requirements) => {
  return [...requirements].sort((a, b) => {
    const urgencyA = URGENCY_ORDER.indexOf(a.urgencyLevel);
    const urgencyB = URGENCY_ORDER.indexOf(b.urgencyLevel);

    if (urgencyA !== urgencyB) {
      return urgencyA - urgencyB;
    }

    // Same urgency: sort by deadline (soonest first)
    const deadlineA = a.deliveryDeadline?.toMillis?.() || a.deliveryDeadline || Infinity;
    const deadlineB = b.deliveryDeadline?.toMillis?.() || b.deliveryDeadline || Infinity;
    return deadlineA - deadlineB;
  });
};

/**
 * Filter out expired requirements
 */
export const filterActiveRequirements = (requirements) => {
  const now = Date.now();
  return requirements.filter((req) => {
    if (req.status === 'fulfilled') return false;
    if (req.expirySensitive && req.expiryDate) {
      const expiry = req.expiryDate?.toMillis?.() || req.expiryDate;
      return expiry > now;
    }
    return true;
  });
};

/**
 * Find best NGO match for a donation category
 * Prioritizes: emergency > high_priority > normal, then soonest deadline
 */
export const findBestMatch = (requirements, donationCategory) => {
  const matching = requirements.filter(
    (req) => req.category === donationCategory && req.status !== 'fulfilled'
  );

  const active = filterActiveRequirements(matching);
  const sorted = sortByUrgency(active);

  return sorted.length > 0 ? sorted[0] : null;
};

/**
 * Get initials from a name (for privacy-safe display)
 */
export const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
