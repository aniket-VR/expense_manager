// hooks/useTransactions.js
// Real-time transactions with full derived stats.
// filter: 'today' | 'week' | 'month' | 'year'

import { useState, useEffect, useMemo } from 'react';
import { subscribeTransactionsByFilter } from '../services/transactionService';

const useTransactions = (userId, filter = 'month') => {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    if (!userId) { setTransactions([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeTransactionsByFilter(
      userId, filter,
      (data) => { setTransactions(data); setLoading(false); setError(null); },
      (err)  => { console.error(err);   setError('Failed to load'); setLoading(false); }
    );
    return () => unsub();
  }, [userId, filter]);

  // All derived values memoised — no recalculation on unrelated renders
  const derived = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const income   = transactions.filter((t) => t.type === 'income');

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome  = income.reduce((s,  t) => s + t.amount, 0);
    const balance      = totalIncome - totalExpense;
    const savingsRate  = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    // Category breakdown (expense only for spending chart)
    const byCategoryMap = {};
    expenses.forEach((t) => {
      byCategoryMap[t.category] = (byCategoryMap[t.category] || 0) + t.amount;
    });
    const byCategory = Object.entries(byCategoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    // Income category breakdown
    const byIncomeCategoryMap = {};
    income.forEach((t) => {
      byIncomeCategoryMap[t.category] = (byIncomeCategoryMap[t.category] || 0) + t.amount;
    });
    const byIncomeCategory = Object.entries(byIncomeCategoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    return {
      expenses, income,
      totalExpense, totalIncome, balance, savingsRate,
      byCategory, byIncomeCategory,
    };
  }, [transactions]);

  return { transactions, loading, error, ...derived };
};

export default useTransactions;
