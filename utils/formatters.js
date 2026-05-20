// utils/formatters.js

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const formatExpenseDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return `Today · ${timeStr}`;
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${timeStr}`;
};

export const formatShortDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Legacy compat — kept so old ExpenseItem/AddExpenseScreen don't break
export const getCategoryEmoji = (category) => {
  const { getCategoryMeta } = require('./constants');
  return getCategoryMeta(category)?.emoji || '📦';
};

export const sumExpenses = (items) =>
  items.reduce((t, i) => t + (i.amount || 0), 0);

export const sumByType = (items, type) =>
  items.filter((i) => i.type === type).reduce((t, i) => t + (i.amount || 0), 0);

export const groupByCategory = (items) => {
  const map = {};
  items.forEach((item) => {
    const key = item.category || 'other';
    map[key] = (map[key] || 0) + item.amount;
  });
  return Object.entries(map)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

export const groupByDay = (items, days = 7) => {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const label = i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' });
    const total = items
      .filter((item) => {
        const id = item.date?.toDate ? item.date.toDate() : new Date(item.date);
        return id >= d && id < next;
      })
      .reduce((s, item) => s + item.amount, 0);
    result.push({ label, total });
  }
  return result;
};
