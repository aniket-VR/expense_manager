// hooks/useFamilyTransactions.js
// ─────────────────────────────────────────────────────────
// Transparently switches query scope based on role:
//   • Head   → subscribeFamilyTransactions (all family members)
//   • Member → subscribeTransactionsByFilter (own only)
//
// This means every screen that wants "the right transactions
// for this user's role" just calls this one hook.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import {
  subscribeFamilyTransactions,
  subscribeTransactionsByFilter,
} from '../services/transactionService';

const useFamilyTransactions = (userId, familyId, role, filter = 'month') => {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const isHead = role === 'head';

  useEffect(() => {
    if (!userId) { setTransactions([]); setLoading(false); return; }
    setLoading(true);

    let unsub;

    if (isHead && familyId) {
      // Head: listen to all family transactions
      unsub = subscribeFamilyTransactions(
        familyId,
        filter,
        (data) => { setTransactions(data); setLoading(false); setError(null); },
        (err)  => { console.error(err); setError('Failed to load'); setLoading(false); }
      );
    } else {
      // Member or solo: personal transactions only
      unsub = subscribeTransactionsByFilter(
        userId,
        filter,
        (data) => { setTransactions(data); setLoading(false); setError(null); },
        (err)  => { console.error(err); setError('Failed to load'); setLoading(false); }
      );
    }

    return () => unsub?.();
  }, [userId, familyId, role, filter, isHead]);

  // Derived values
  const derived = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const income   = transactions.filter((t) => t.type === 'income');
    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome  = income.reduce((s, t)   => s + t.amount, 0);
    const balance      = totalIncome - totalExpense;
    const savingsRate  = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    // Per-member breakdown (for family analytics)
    const byMember = {};
    transactions.forEach((t) => {
      const uid = t.userId;
      if (!byMember[uid]) byMember[uid] = { expense: 0, income: 0, count: 0 };
      byMember[uid][t.type] = (byMember[uid][t.type] || 0) + t.amount;
      byMember[uid].count   += 1;
    });

    // Category breakdown (expenses)
    const byCategoryMap = {};
    expenses.forEach((t) => {
      byCategoryMap[t.category] = (byCategoryMap[t.category] || 0) + t.amount;
    });
    const byCategory = Object.entries(byCategoryMap)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    return {
      expenses, income,
      totalExpense, totalIncome, balance, savingsRate,
      byMember, byCategory,
    };
  }, [transactions]);

  return { transactions, loading, error, ...derived };
};

export default useFamilyTransactions;
