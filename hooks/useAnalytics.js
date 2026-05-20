// hooks/useAnalytics.js
// ─────────────────────────────────────────────────────────
// Fetches and memoises all analytics data.
// Re-fetches only when userId / period / accountId change.
// Uses one-shot getDocs (not onSnapshot) — analytics data
// is refreshed on demand, not kept live.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchAnalyticsData,
  aggregateByCategory,
  buildTrendSeries,
  computeSummary,
  splitByType,
} from '../services/analyticsService';

const useAnalytics = (userId, period = 'month', accountId = 'all') => {
  const [raw,       setRaw]       = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  // ── Fetch ───────────────────────────────────────────────
  const fetch = useCallback(async () => {
    if (!userId) { setRaw([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalyticsData({ userId, period, accountId });
      setRaw(data);
      setFetchedAt(new Date());
    } catch (e) {
      console.error('useAnalytics fetch error:', e);
      setError('Failed to load analytics. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [userId, period, accountId]);

  useEffect(() => { fetch(); }, [fetch]);

  // ── Derived data (all memoised) ─────────────────────────
  const summary = useMemo(() => computeSummary(raw), [raw]);

  const { expenses, income } = useMemo(() => splitByType(raw), [raw]);

  // Category breakdown for pie chart + table
  const expenseByCategory = useMemo(
    () => aggregateByCategory(expenses),
    [expenses]
  );
  const incomeByCategory = useMemo(
    () => aggregateByCategory(income),
    [income]
  );

  // Trend series for line chart
  const trendSeries = useMemo(
    () => buildTrendSeries(raw, period),
    [raw, period]
  );

  // Pie chart data shape (react-native-chart-kit format)
  const pieData = useMemo(() => {
    if (!expenseByCategory.length) return [];
    const total = summary.totalExpense || 1;
    return expenseByCategory.map((item, i) => ({
      name:       item.category,
      population: item.total,
      color:      PIE_COLORS[i % PIE_COLORS.length],
      legendFontColor: '#8B949E',
      legendFontSize:  12,
      percentage: ((item.total / total) * 100).toFixed(1),
    }));
  }, [expenseByCategory, summary.totalExpense]);

  // Income pie chart data
  const incomePieData = useMemo(() => {
    if (!incomeByCategory.length) return [];
    const total = summary.totalIncome || 1;
    return incomeByCategory.map((item, i) => ({
      name:       item.category,
      population: item.total,
      color:      INCOME_PIE_COLORS[i % INCOME_PIE_COLORS.length],
      legendFontColor: '#8B949E',
      legendFontSize:  12,
      percentage: ((item.total / total) * 100).toFixed(1),
    }));
  }, [incomeByCategory, summary.totalIncome]);

  return {
    raw, loading, error, fetchedAt, refetch: fetch,
    summary, expenses, income,
    expenseByCategory, incomeByCategory,
    trendSeries, pieData, incomePieData,
  };
};

// ── Colour palettes ───────────────────────────────────────
const PIE_COLORS = [
  '#F85149','#FF9800','#FFC107','#4CAF50','#2196F3',
  '#9C27B0','#E91E63','#00BCD4','#795548','#3F51B5',
  '#009688','#607D8B','#8B949E',
];

const INCOME_PIE_COLORS = [
  '#2EA043','#00C6A2','#58A6FF','#D29922','#3FB950',
  '#D2A8FF','#8B949E',
];

export default useAnalytics;
