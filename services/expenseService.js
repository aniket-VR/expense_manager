// services/expenseService.js
// ─────────────────────────────────────────────────────────
// Firestore CRUD operations for the /expenses collection.
// All queries are scoped to the authenticated user's uid.
// ─────────────────────────────────────────────────────────

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const EXPENSES_COL = 'expenses';

// ─── Write ────────────────────────────────────────────────

/**
 * Add a new expense document.
 * @param {string} userId
 * @param {number} amount
 * @param {string} category
 * @param {string} [note]
 * @returns {Promise<string>} the new document id
 */
export const addExpense = async (userId, amount, category, note = '') => {
  const docRef = await addDoc(collection(db, EXPENSES_COL), {
    userId,
    amount,
    category: category.toLowerCase().trim(),
    note: note.trim(),
    date: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Delete an expense by document id.
 */
export const deleteExpense = async (expenseId) => {
  await deleteDoc(doc(db, EXPENSES_COL, expenseId));
};

// ─── Real-time listeners ──────────────────────────────────

/**
 * Listen to TODAY's expenses for a user.
 * Calls onUpdate(expenses[]) whenever data changes.
 * Returns an unsubscribe function — call it on unmount.
 */
export const subscribeTodayExpenses = (userId, onUpdate, onError) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, EXPENSES_COL),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(expenses);
    },
    onError
  );
};

/**
 * Listen to expenses filtered by a time range.
 * filter: 'today' | 'week' | 'month'
 */
export const subscribeExpensesByFilter = (userId, filter, onUpdate, onError) => {
  const now = new Date();
  let startDate = new Date();

  if (filter === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (filter === 'week') {
    // Last 7 days
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
  } else if (filter === 'month') {
    // Start of current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const q = query(
    collection(db, EXPENSES_COL),
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(startDate)),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const expenses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(expenses);
    },
    onError
  );
};

// ─── User settings ────────────────────────────────────────

/**
 * Update the user's daily limit in Firestore.
 */
export const updateDailyLimit = async (userId, newLimit) => {
  await updateDoc(doc(db, 'users', userId), { dailyLimit: newLimit });
};
