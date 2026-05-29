/**
 * MeshMission Category Constants
 * NEVER hardcode category strings — always import from here.
 */

export const CATEGORIES = {
  CLOTHES: 'clothes',
  FOOD: 'food',
  MEDICINE: 'medicine',
  STATIONERY: 'stationery',
  HYGIENE_KITS: 'hygiene_kits',
  ELECTRONICS: 'electronics',
  HOUSEHOLD: 'household',
  BOOKS: 'books',
};

/** All 8 categories for donation uploads */
export const CATEGORY_LIST = [
  CATEGORIES.CLOTHES,
  CATEGORIES.FOOD,
  CATEGORIES.MEDICINE,
  CATEGORIES.STATIONERY,
  CATEGORIES.HYGIENE_KITS,
  CATEGORIES.ELECTRONICS,
  CATEGORIES.HOUSEHOLD,
  CATEGORIES.BOOKS,
];

/** Subset for NGO requirements */
export const NGO_REQUIREMENT_CATEGORY_LIST = [
  CATEGORIES.FOOD,
  CATEGORIES.CLOTHES,
  CATEGORIES.MEDICINE,
  CATEGORIES.STATIONERY,
  CATEGORIES.HYGIENE_KITS,
];

/** Human-readable labels */
export const CATEGORY_LABELS = {
  [CATEGORIES.CLOTHES]: 'Clothes',
  [CATEGORIES.FOOD]: 'Food',
  [CATEGORIES.MEDICINE]: 'Medicine',
  [CATEGORIES.STATIONERY]: 'Stationery',
  [CATEGORIES.HYGIENE_KITS]: 'Hygiene Kits',
  [CATEGORIES.ELECTRONICS]: 'Electronics',
  [CATEGORIES.HOUSEHOLD]: 'Household',
  [CATEGORIES.BOOKS]: 'Books',
};

/** Icons for each category */
export const CATEGORY_ICONS = {
  [CATEGORIES.CLOTHES]: '👕',
  [CATEGORIES.FOOD]: '🍲',
  [CATEGORIES.MEDICINE]: '💊',
  [CATEGORIES.STATIONERY]: '✏️',
  [CATEGORIES.HYGIENE_KITS]: '🧴',
  [CATEGORIES.ELECTRONICS]: '📱',
  [CATEGORIES.HOUSEHOLD]: '🏠',
  [CATEGORIES.BOOKS]: '📚',
};
