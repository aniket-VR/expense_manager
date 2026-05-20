// hooks/useCategoryLimits.js
// ─────────────────────────────────────────────────────────
// Combines real-time category limits from Firestore with
// real-time current-month spending from useTransactions.
//
// Returns:
//   limits        — raw Firestore map { categoryId: limitDoc }
//   enriched      — array of { meta, spent, limit, remaining, pct, exceeded }
//   exceededCount — how many categories are over budget
//   loading
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from 'react';
import { subscribeCategoryLimits } from '../services/categoryLimitService';
import { subscribeTransactionsByFilter } from '../services/transactionService';
import { getCategoryMeta, EXPENSE_CATEGORIES } from '../utils/constants';

const useCategoryLimits = (userId) => {
  const [limits,   setLimits]   = useState({});   // { catId: { limitAmount, id, ... } }
  const [expenses, setExpenses] = useState([]);   // this month's expenses
  const [limitsLoading, setLimitsLoading] = useState(true);
  const [txnsLoading,   setTxnsLoading]   = useState(true);

  // ── Subscribe to limits ─────────────────────────────────
  useEffect(() => {
    if (!userId) { setLimits({}); setLimitsLoading(false); return; }

    const unsub = subscribeCategoryLimits(
      userId,
      (data) => { setLimits(data); setLimitsLoading(false); },
      ()     => setLimitsLoading(false)
    );
    return () => unsub();
  }, [userId]);

  // ── Subscribe to this month's transactions ──────────────
  // Using 'month' filter so limits are always compared against
  // the current month's spending.
  useEffect(() => {
    if (!userId) { setExpenses([]); setTxnsLoading(false); return; }

    const unsub = subscribeTransactionsByFilter(
      userId,
      'month',
      (txns) => {
        // Only expense-type transactions count against limits
        setExpenses(txns.filter((t) => t.type === 'expense'));
        setTxnsLoading(false);
      },
      () => setTxnsLoading(false)
    );
    return () => unsub();
  }, [userId]);

  // ── Compute spending per category ───────────────────────
  const spendingMap = useMemo(() => {
    const map = {};
    expenses.forEach((t) => {
      const cat = t.category || 'others';
      map[cat] = (map[cat] || 0) + t.amount;
    });
    return map;
  }, [expenses]);

  // ── Enrich: join limits + spending ─────────────────────
  const enriched = useMemo(() => {
    return Object.entries(limits).map(([categoryId, limitDoc]) => {
      const meta      = getCategoryMeta(categoryId, 'expense');
      const spent     = spendingMap[categoryId] || 0;
      const limit     = limitDoc.limitAmount;
      const remaining = Math.max(limit - spent, 0);
      const pct       = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
      const exceeded  = spent > limit;
      const overBy    = exceeded ? spent - limit : 0;

      return {
        id:          limitDoc.id,
        categoryId,
        meta,
        spent,
        limit,
        remaining,
        pct,
        exceeded,
        overBy,
      };
    }).sort((a, b) => b.pct - a.pct); // most-used first
  }, [limits, spendingMap]);

  // Also expose categories that have spending but NO limit set
  // (useful for the "set a limit" suggestion list)
  const unbudgeted = useMemo(() => {
    return Object.entries(spendingMap)
      .filter(([cat]) => !limits[cat])
      .map(([cat, spent]) => ({ categoryId: cat, meta: getCategoryMeta(cat, 'expense'), spent }))
      .sort((a, b) => b.spent - a.spent);
  }, [spendingMap, limits]);

  const exceededCount = enriched.filter((e) => e.exceeded).length;
  const loading       = limitsLoading || txnsLoading;

  return {
    limits,        // raw map
    enriched,      // joined array ready for UI
    unbudgeted,    // spending with no limit set
    spendingMap,   // { catId: amount } — for any custom use
    exceededCount,
    loading,
  };
};

export default useCategoryLimits;
