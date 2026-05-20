// utils/constants.js
// Single source of truth for all app-wide enums and category data.

export const TXN_TYPE = {
  EXPENSE: 'expense',
  INCOME:  'income',
};

// ── Expense categories ────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  { id: 'food',          name: 'Food',          emoji: '🍽️',  color: '#FF9800' },
  { id: 'groceries',     name: 'Groceries',     emoji: '🛒',  color: '#4CAF50' },
  { id: 'travel',        name: 'Travel',        emoji: '✈️',  color: '#2196F3' },
  { id: 'fuel',          name: 'Fuel',          emoji: '⛽',  color: '#FF5722' },
  { id: 'gym',           name: 'Gym',           emoji: '🏋️', color: '#9C27B0' },
  { id: 'shopping',      name: 'Shopping',      emoji: '🛍️', color: '#E91E63' },
  { id: 'bills',         name: 'Bills',         emoji: '💡',  color: '#FFC107' },
  { id: 'health',        name: 'Health',        emoji: '💊',  color: '#00BCD4' },
  { id: 'rent',          name: 'Rent',          emoji: '🏠',  color: '#795548' },
  { id: 'entertainment', name: 'Fun',           emoji: '🎬',  color: '#3F51B5' },
  { id: 'education',     name: 'Education',     emoji: '📚',  color: '#009688' },
  { id: 'emi',           name: 'EMI',           emoji: '📋',  color: '#607D8B' },
  { id: 'others',        name: 'Others',        emoji: '📦',  color: '#8B949E' },
];

// ── Income categories ─────────────────────────────────────
export const INCOME_CATEGORIES = [
  { id: 'salary',     name: 'Salary',     emoji: '💼', color: '#2EA043' },
  { id: 'business',   name: 'Business',   emoji: '🏢', color: '#00C6A2' },
  { id: 'freelance',  name: 'Freelance',  emoji: '💻', color: '#58A6FF' },
  { id: 'interest',   name: 'Interest',   emoji: '📊', color: '#D29922' },
  { id: 'investment', name: 'Investment', emoji: '📈', color: '#3FB950' },
  { id: 'gift',       name: 'Gift',       emoji: '🎁', color: '#D2A8FF' },
  { id: 'other',      name: 'Other',      emoji: '💰', color: '#8B949E' },
];

// ── Default account seeds ─────────────────────────────────
export const DEFAULT_ACCOUNTS = [
  { id: 'cash',       name: 'Cash',       emoji: '💵', color: '#2EA043' },
  { id: 'bank',       name: 'Bank',       emoji: '🏦', color: '#58A6FF' },
  { id: 'card',       name: 'Card',       emoji: '💳', color: '#D29922' },
  { id: 'wallet',     name: 'Wallet',     emoji: '👛', color: '#D2A8FF' },
  { id: 'investment', name: 'Investment', emoji: '📈', color: '#00C6A2' },
];

// ── Chart palette ─────────────────────────────────────────
export const CHART_COLORS = [
  '#00C6A2','#58A6FF','#F85149','#D29922','#3FB950',
  '#D2A8FF','#FF9800','#E91E63','#00BCD4','#8BC34A',
  '#FF5722','#9C27B0','#607D8B',
];

// ── Lookup helpers ────────────────────────────────────────
export const getCategoryMeta = (id, type) => {
  // If type is specified, search that list first for accuracy
  if (type === TXN_TYPE.INCOME) {
    const found = INCOME_CATEGORIES.find((c) => c.id === id);
    if (found) return found;
  }
  if (type === TXN_TYPE.EXPENSE) {
    const found = EXPENSE_CATEGORIES.find((c) => c.id === id);
    if (found) return found;
  }
  // Fallback: search both
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.id === id) || { id, name: id, emoji: '📦', color: '#8B949E' };
};

export const getAccountMeta = (id) =>
  DEFAULT_ACCOUNTS.find((a) => a.id === id) || { id, name: id, emoji: '💰', color: '#8B949E' };

export const getAllCategories = (type) =>
  type === TXN_TYPE.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
