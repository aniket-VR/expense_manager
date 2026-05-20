// hooks/useAccountTransactions.js
// Real-time transactions filtered to a single account.

import { useState, useEffect } from 'react';
import { subscribeAccountTransactions } from '../services/transactionService';
import { sumByType } from '../utils/formatters';

const useAccountTransactions = (userId, accountId) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !accountId) { setTransactions([]); setLoading(false); return; }

    const unsub = subscribeAccountTransactions(
      userId, accountId,
      (data) => { setTransactions(data); setLoading(false); },
      ()     => setLoading(false)
    );
    return () => unsub();
  }, [userId, accountId]);

  const totalIn  = sumByType(transactions, 'income');
  const totalOut = sumByType(transactions, 'expense');

  return { transactions, totalIn, totalOut, loading };
};

export default useAccountTransactions;
