// services/analyticsService.js
// ─────────────────────────────────────────────────────────
// All Firestore query logic for the analytics dashboard.
//
// Design decisions:
//   • One-shot getDocs() instead of onSnapshot() — analytics
//     data is expensive to keep live and the user explicitly
//     refreshes with the period/filter controls.
//   • All heavy aggregation runs client-side after a single
//     indexed query (userId + date range). This avoids
//     multiple round-trips and keeps Firestore costs low.
//   • Results are memoised in the hook layer; this service
//     is purely data-fetching with no state.
// ─────────────────────────────────────────────────────────

import {
  collection, query, where, orderBy,
  getDocs, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'transactions';

// ── Date range helpers ────────────────────────────────────

/**
 * Return a { start: Date, end: Date } window for a named period.
 * period: 'week' | 'month' | 'quarter' | 'year' | 'all'
 */
export const getDateRange = (period) => {
  const now = new Date();
  const end = new Date(now);               // always "now"
  let start = new Date(now);

  switch (period) {
    case 'week':
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
    default:
      start = new Date(2020, 0, 1);        // effectively "beginning of time"
      break;
  }

  return { start, end };
};

// ── Core fetch ────────────────────────────────────────────

/**
 * Fetch all transactions for a user within a date range.
 * Optionally filter by accountId (client-side, avoids extra index).
 *
 * Firestore index required:
 *   Collection: transactions
 *   Fields: userId ASC, date DESC
 *
 * @returns {Promise<Transaction[]>}
 */
export const fetchAnalyticsData = async ({ userId, period, accountId }) => {
  const { start } = getDateRange(period);

  // Single indexed query — cheapest possible read
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    where('date',   '>=', Timestamp.fromDate(start)),
    orderBy('date', 'asc')              // asc for chronological trend lines
  );

  const snap = await getDocs(q);
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Client-side account filter (no extra composite index needed)
  if (accountId && accountId !== 'all') {
    docs = docs.filter((d) => d.accountId === accountId);
  }

  return docs;
};

// ── Aggregation helpers ───────────────────────────────────

/**
 * Separate transactions into expense / income arrays.
 */
export const splitByType = (transactions) => ({
  expenses: transactions.filter((t) => t.type === 'expense'),
  income:   transactions.filter((t) => t.type === 'income'),
});

/**
 * Sum amounts per category.
 * Returns [{ category, total, count }] sorted by total desc.
 */
export const aggregateByCategory = (transactions) => {
  const map = {};
  transactions.forEach((t) => {
    const key = t.category || 'others';
    if (!map[key]) map[key] = { category: key, total: 0, count: 0 };
    map[key].total += t.amount;
    map[key].count += 1;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
};

/**
 * Build a time-series for the trend line.
 * granularity: 'day' | 'week' | 'month'
 *
 * Returns { labels: string[], expenseData: number[], incomeData: number[] }
 * Always returns exactly `bucketCount` buckets so the chart is even.
 */
export const buildTrendSeries = (transactions, period) => {
  // Choose granularity and bucket count based on selected period
  let granularity, bucketCount;
  if (period === 'week') {
    granularity = 'day';   bucketCount = 7;
  } else if (period === 'month') {
    granularity = 'day';   bucketCount = 30;
  } else if (period === 'quarter') {
    granularity = 'week';  bucketCount = 13;
  } else {
    granularity = 'month'; bucketCount = 12;
  }

  const now    = new Date();
  const labels = [];
  const expenseData = [];
  const incomeData = [];

  for (let i = bucketCount - 1; i >= 0; i--) {
    const bucketStart = new Date(now);
    const bucketEnd   = new Date(now);

    if (granularity === 'day') {
      bucketStart.setDate(now.getDate() - i);
      bucketStart.setHours(0, 0, 0, 0);
      bucketEnd.setDate(now.getDate() - i);
      bucketEnd.setHours(23, 59, 59, 999);
      labels.push(
        i === 0 ? 'Today'
        : bucketStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
      );
    } else if (granularity === 'week') {
      bucketStart.setDate(now.getDate() - i * 7);
      bucketStart.setHours(0, 0, 0, 0);
      bucketEnd.setDate(now.getDate() - (i - 1) * 7 - 1);
      bucketEnd.setHours(23, 59, 59, 999);
      labels.push(`W${bucketCount - i}`);
    } else {
      // month
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      bucketStart.setFullYear(m.getFullYear(), m.getMonth(), 1);
      bucketStart.setHours(0, 0, 0, 0);
      bucketEnd.setFullYear(m.getFullYear(), m.getMonth() + 1, 0);
      bucketEnd.setHours(23, 59, 59, 999);
      labels.push(m.toLocaleDateString('en-IN', { month: 'short' }));
    }

    let expTotal = 0, incTotal = 0;
    transactions.forEach((t) => {
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
      if (d >= bucketStart && d <= bucketEnd) {
        if (t.type === 'expense') expTotal += t.amount;
        else                       incTotal += t.amount;
      }
    });

    expenseData.push(expTotal);
    incomeData.push(incTotal);
  }

  // For weekly period, only show last 7 labels to keep the chart readable
  const maxLabels = period === 'week' ? 7 : period === 'month' ? 6 : bucketCount;
  const step = Math.max(1, Math.floor(bucketCount / maxLabels));
  const sparseLabels = labels.map((l, i) => (i % step === 0 ? l : ''));

  return { labels: sparseLabels, expenseData, incomeData, rawLabels: labels };
};

/**
 * Compute summary stats from raw transactions.
 */
export const computeSummary = (transactions) => {
  const { expenses, income } = splitByType(transactions);
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome  = income.reduce((s,  t) => s + t.amount, 0);
  const savings      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  const avgExpense   = expenses.length ? totalExpense / expenses.length : 0;
  const avgIncome    = income.length   ? totalIncome  / income.length   : 0;
  const largestExp   = expenses.reduce((m, t) => t.amount > m ? t.amount : m, 0);

  return {
    totalExpense, totalIncome, savings, savingsRate,
    avgExpense, avgIncome, largestExp,
    expenseCount: expenses.length,
    incomeCount:  income.length,
  };
};
