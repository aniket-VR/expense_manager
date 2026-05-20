// hooks/useAccounts.js
// Real-time accounts with derived totals.

import { useState, useEffect, useMemo } from 'react';
import { subscribeAccounts } from '../services/accountService';

const useAccounts = (userId) => {
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!userId) { setAccounts([]); setLoading(false); return; }

    const unsub = subscribeAccounts(
      userId,
      (data) => { setAccounts(data); setLoading(false); setError(null); },
      (err)  => { console.error(err); setError('Failed to load accounts'); setLoading(false); }
    );
    return () => unsub();
  }, [userId]);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
    [accounts]
  );

  return { accounts, totalBalance, loading, error };
};

export default useAccounts;
