// services/accountService.js
// ─────────────────────────────────────────────────────────
// All Firestore operations for the /accounts collection.
// Balance is kept in sync via adjustBalance() which is called
// from addTransaction / deleteTransaction — never directly.
// ─────────────────────────────────────────────────────────

import {
  collection, addDoc, deleteDoc, updateDoc, getDoc,
  query, where, orderBy, onSnapshot,
  serverTimestamp, doc, increment, getDocs, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'accounts';

// ── Seed defaults ─────────────────────────────────────────

/**
 * Called once after registration to create the five default
 * accounts with zero balance. Safe to call again — checks first.
 */
export const seedDefaultAccounts = async (userId) => {
  const existing = await getDocs(
    query(collection(db, COL), where('userId', '==', userId))
  );
  if (!existing.empty) return; // already seeded

  const defaults = [
    { name: 'Cash',       emoji: '💵', color: '#2EA043' },
    { name: 'Bank',       emoji: '🏦', color: '#58A6FF' },
    { name: 'Card',       emoji: '💳', color: '#D29922' },
    { name: 'Wallet',     emoji: '👛', color: '#D2A8FF' },
    { name: 'Investment', emoji: '📈', color: '#00C6A2' },
  ];

  const batch = writeBatch(db);
  defaults.forEach((acc) => {
    const ref = doc(collection(db, COL));
    batch.set(ref, {
      userId,
      name: acc.name,
      emoji: acc.emoji,
      color: acc.color,
      balance: 0,
      isDefault: true,
      createdAt: serverTimestamp(),
    });
  });
  await batch.commit();
};

// ── CRUD ──────────────────────────────────────────────────

/**
 * Create a new custom account.
 */
export const createAccount = async (userId, { name, emoji, color, initialBalance }) => {
  if (!name?.trim()) throw new Error('Account name is required');

  const ref = await addDoc(collection(db, COL), {
    userId,
    name: name.trim(),
    emoji: emoji || '💰',
    color: color || '#8B949E',
    balance: Number(initialBalance) || 0,
    isDefault: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Update an account's metadata (name / emoji / color).
 * Does NOT touch balance — use adjustBalance for that.
 */
export const updateAccount = async (accountId, { name, emoji, color }) => {
  const updates = {};
  if (name !== undefined)  updates.name  = name.trim();
  if (emoji !== undefined) updates.emoji = emoji;
  if (color !== undefined) updates.color = color;
  await updateDoc(doc(db, COL, accountId), updates);
};

/**
 * Delete an account document.
 * Caller should warn if the account has transactions.
 */
export const deleteAccount = async (accountId) =>
  deleteDoc(doc(db, COL, accountId));

// ── Balance ───────────────────────────────────────────────

/**
 * Atomically adjust an account's balance.
 * delta > 0 = add money (income)
 * delta < 0 = subtract money (expense)
 */
export const adjustBalance = async (accountId, delta) => {
  if (!accountId) return;
  await updateDoc(doc(db, COL, accountId), {
    balance: increment(Number(delta)),
  });
};

/**
 * Directly set a balance (for manual correction).
 */
export const setBalance = async (accountId, newBalance) => {
  await updateDoc(doc(db, COL, accountId), {
    balance: Number(newBalance),
  });
};

/**
 * Get a single account (one-shot read).
 */
export const getAccount = async (accountId) => {
  const snap = await getDoc(doc(db, COL, accountId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ── Real-time listener ────────────────────────────────────

/**
 * Subscribe to all accounts for a user, sorted by createdAt.
 * Returns unsubscribe function.
 */
export const subscribeAccounts = (userId, onUpdate, onError) => {
  const q = query(
    collection(db, COL),
    where('userId', '==', userId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError ?? console.error
  );
};

// ── Transfer between accounts ─────────────────────────────

/**
 * Move money from one account to another atomically.
 */
export const transferBetweenAccounts = async (fromId, toId, amount) => {
  const n = Number(amount);
  if (!n || n <= 0) throw new Error('Transfer amount must be positive');

  const batch = writeBatch(db);
  batch.update(doc(db, COL, fromId), { balance: increment(-n) });
  batch.update(doc(db, COL, toId),   { balance: increment(n)  });
  await batch.commit();
};
