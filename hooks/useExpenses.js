// hooks/useExpenses.js
// ─────────────────────────────────────────────────────────
// Subscribes to today's expenses in real-time and exposes
// the list + computed total for the Home screen.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { subscribeTodayExpenses } from '../services/expenseService';
import { sumExpenses } from '../utils/formatters';

/**
 * @param {string|null} userId
 * @returns {{
 *   todayExpenses: Expense[],
 *   todayTotal: number,
 *   loading: boolean,
 *   error: string|null,
 * }}
 */
const useExpenses = (userId) => {
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setTodayExpenses([]);
      setTodayTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsub = subscribeTodayExpenses(
      userId,
      (expenses) => {
        setTodayExpenses(expenses);
        setTodayTotal(sumExpenses(expenses));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('useExpenses error:', err);
        setError('Failed to load expenses');
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or userId change
    return () => unsub();
  }, [userId]);

  return { todayExpenses, todayTotal, loading, error };
};

export default useExpenses;
