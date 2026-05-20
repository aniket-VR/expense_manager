// utils/expenseParser.js
// ─────────────────────────────────────────────────────────
// Core utility that parses a WhatsApp-style expense string
// like "200 food" or "50 auto" into a structured object.
//
// Supported formats:
//   "200 food"              → { amount: 200, category: "food",  note: "" }
//   "200 food chai+samosa"  → { amount: 200, category: "food",  note: "chai+samosa" }
//   "1500"                  → { amount: 1500, category: "other", note: "" }
//   "200.50 transport"      → { amount: 200.5, category: "transport", note: "" }
// ─────────────────────────────────────────────────────────

// Common Indian expense category aliases for auto-correction
const CATEGORY_ALIASES = {
  auto: 'transport',
  cab: 'transport',
  uber: 'transport',
  ola: 'transport',
  bus: 'transport',
  train: 'transport',
  metro: 'transport',
  bike: 'transport',
  petrol: 'fuel',
  diesel: 'fuel',
  chai: 'food',
  coffee: 'food',
  tea: 'food',
  lunch: 'food',
  dinner: 'food',
  breakfast: 'food',
  snacks: 'food',
  grocery: 'groceries',
  sabzi: 'groceries',
  vegetables: 'groceries',
  milk: 'groceries',
  medicine: 'health',
  doctor: 'health',
  hospital: 'health',
  gym: 'health',
  movie: 'entertainment',
  ott: 'entertainment',
  netflix: 'entertainment',
  recharge: 'utilities',
  electricity: 'utilities',
  internet: 'utilities',
  wifi: 'utilities',
  rent: 'rent',
  emi: 'emi',
};

/**
 * Normalize a raw category string.
 * Checks alias map and returns the canonical category or the
 * original word (lowercased) if not found in aliases.
 *
 * @param {string} raw
 * @returns {string}
 */
const normalizeCategory = (raw) => {
  const lower = raw.toLowerCase().trim();
  return CATEGORY_ALIASES[lower] || lower;
};

/**
 * Parse a WhatsApp-style expense string.
 *
 * @param {string} input - Raw user input e.g. "200 food"
 * @returns {{ amount: number, category: string, note: string } | null}
 *   Returns null if input is invalid (no valid amount found).
 */
export const parseExpenseInput = (input) => {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Split on whitespace — first token must be the amount
  const tokens = trimmed.split(/\s+/);

  // First token: the amount (supports decimals)
  const rawAmount = parseFloat(tokens[0]);

  if (isNaN(rawAmount) || rawAmount <= 0) {
    // Amount must be a positive number
    return null;
  }

  // Second token: category (optional, defaults to "other")
  const rawCategory = tokens[1] || 'other';
  const category = normalizeCategory(rawCategory);

  // Remaining tokens (3rd onwards): optional note
  const note = tokens.slice(2).join(' ');

  return {
    amount: Math.round(rawAmount * 100) / 100, // round to 2 decimals
    category,
    note,
  };
};

/**
 * Validate raw input before parsing.
 * Returns an error message string, or null if valid.
 *
 * @param {string} input
 * @returns {string|null}
 */
export const validateExpenseInput = (input) => {
  if (!input || !input.trim()) {
    return 'Please enter an expense e.g. "200 food"';
  }

  const tokens = input.trim().split(/\s+/);
  const amount = parseFloat(tokens[0]);

  if (isNaN(amount)) {
    return 'First value must be a number e.g. "200 food"';
  }

  if (amount <= 0) {
    return 'Amount must be greater than ₹0';
  }

  if (amount > 1000000) {
    return 'Amount seems too large. Please check.';
  }

  return null; // valid
};
