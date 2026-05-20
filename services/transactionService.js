// services/transactionService.js
// ─────────────────────────────────────────────────────────
// All Firestore ops for /transactions.
// Every transaction now stores BOTH userId and familyId so
// the Head can query the entire family with a single indexed
// query: where('familyId', '==', fid).
// Child members query by userId as before — unchanged.
// ─────────────────────────────────────────────────────────

import {
  collection, addDoc, deleteDoc, updateDoc, getDoc,
  query, where, orderBy, onSnapshot,
  serverTimestamp, Timestamp, doc, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { adjustBalance } from './accountService';

const COL        = 'transactions';
const LIMITS_COL = 'categoryLimits';

// ── Add ───────────────────────────────────────────────────

/**
 * Create a transaction and adjust the linked account balance.
 * familyId is optional — stored when the user belongs to a family
 * so that the Head can query all family transactions at once.
 */
export const addTransaction = async ({
  userId, amount, type, category,
  accountId, accountName = '',
  note = '', date,
  familyId = null,   // ← new: populated if user has a family
}) => {
  const num = Number(amount);
  if (!num || num <= 0) throw new Error('Amount must be positive');

  const ref = await addDoc(collection(db, COL), {
    userId,
    familyId,                          // null for solo users; familyId for family members
    amount: num,
    type,
    category: category.toLowerCase().trim(),
    accountId:   accountId   || '',
    accountName: accountName || '',
    note: note.trim(),
    date: date ? Timestamp.fromDate(date) : serverTimestamp(),
  });

  if (accountId) {
    const delta = type === 'income' ? num : -num;
    await adjustBalance(accountId, delta);
  }

  return ref.id;
};

// ── Delete ────────────────────────────────────────────────

export const deleteTransaction = async (transactionId) => {
  const snap = await getDoc(doc(db, COL, transactionId));
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.accountId) {
    const delta = data.type === 'income' ? -data.amount : data.amount;
    await adjustBalance(data.accountId, delta);
  }
  await deleteDoc(snap.ref);
};

// ── Real-time listeners — personal ────────────────────────

export const subscribeTodayTransactions = (userId, onUpdate, onError) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  return onSnapshot(
    query(
      collection(db, COL),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(start)),
      orderBy('date', 'desc')
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError ?? console.error
  );
};

const getDateStart = (filter) => {
  const now   = new Date();
  let   start = new Date();
  if      (filter === 'today')   { start.setHours(0, 0, 0, 0); }
  else if (filter === 'week')    { start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0); }
  else if (filter === 'month')   { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (filter === 'quarter') { start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); }
  else if (filter === 'year')    { start = new Date(now.getFullYear(), 0, 1); }
  else if (filter === 'all')     { start = new Date(2020, 0, 1); }
  else                           { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  return start;
};

export const subscribeTransactionsByFilter = (userId, filter, onUpdate, onError) => {
  return onSnapshot(
    query(
      collection(db, COL),
      where('userId', '==', userId),
      where('date',   '>=', Timestamp.fromDate(getDateStart(filter))),
      orderBy('date', 'desc')
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError ?? console.error
  );
};

export const subscribeAccountTransactions = (userId, accountId, onUpdate, onError) => {
  return onSnapshot(
    query(
      collection(db, COL),
      where('userId',    '==', userId),
      where('accountId', '==', accountId),
      orderBy('date', 'desc')
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError ?? console.error
  );
};

// ── Real-time listeners — family (Head only) ──────────────

/**
 * Subscribe to ALL transactions for a family (any member).
 * Requires composite index: familyId ASC + date DESC.
 * This query is only issued when role === 'head'.
 */
export const subscribeFamilyTransactions = (familyId, filter, onUpdate, onError) => {
  if (!familyId) { onUpdate([]); return () => {}; }

  return onSnapshot(
    query(
      collection(db, COL),
      where('familyId', '==', familyId),
      where('date',     '>=', Timestamp.fromDate(getDateStart(filter))),
      orderBy('date', 'desc')
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError ?? console.error
  );
};

// ── One-shot fetch — personal & family ───────────────────

export const fetchTransactionsByFilter = async (userId, filter) => {
  const snap = await getDocs(query(
    collection(db, COL),
    where('userId', '==', userId),
    where('date',   '>=', Timestamp.fromDate(getDateStart(filter))),
    orderBy('date', 'desc')
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const fetchFamilyTransactionsByFilter = async (familyId, filter) => {
  if (!familyId) return [];
  const snap = await getDocs(query(
    collection(db, COL),
    where('familyId', '==', familyId),
    where('date',     '>=', Timestamp.fromDate(getDateStart(filter))),
    orderBy('date', 'desc')
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Category limits ───────────────────────────────────────

export const subscribeCategoryLimits = (userId, onUpdate, onError) => {
  return onSnapshot(
    query(collection(db, LIMITS_COL), where('userId', '==', userId)),
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => { const data = d.data(); map[data.category] = { ...data, id: d.id }; });
      onUpdate(map);
    },
    onError ?? console.error
  );
};

export const setCategoryLimit = async (userId, category, limitAmount) => {
  const snap = await getDocs(query(
    collection(db, LIMITS_COL),
    where('userId',   '==', userId),
    where('category', '==', category)
  ));
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { limitAmount: Number(limitAmount) });
  } else {
    await addDoc(collection(db, LIMITS_COL), {
      userId, category, limitAmount: Number(limitAmount), createdAt: serverTimestamp(),
    });
  }
};

export const removeCategoryLimit = async (id) => deleteDoc(doc(db, LIMITS_COL, id));
