// services/categoryLimitService.js
// ─────────────────────────────────────────────────────────
// All Firestore operations for the /categoryLimits collection.
//
// Schema per document:
//   userId      string   — owner
//   category    string   — matches EXPENSE_CATEGORIES id
//   limitAmount number   — monthly budget cap in ₹
//   createdAt   Timestamp
//   updatedAt   Timestamp
//
// Design:
//   • One document per (userId, category) pair — enforced by
//     the upsert logic in setCategoryLimit.
//   • Real-time listener (onSnapshot) so the UI reacts
//     immediately when a limit is saved or deleted.
//   • Spending data is joined client-side in useCategoryLimits
//     to avoid a second Firestore query per category.
// ─────────────────────────────────────────────────────────

import {
  collection, addDoc, deleteDoc, updateDoc,
  query, where, onSnapshot, getDocs,
  serverTimestamp, doc, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const COL = 'categoryLimits';

// ── Real-time listener ────────────────────────────────────

/**
 * Subscribe to all category limits for a user.
 * Calls onUpdate with a map: { [categoryId]: { id, limitAmount, category, userId } }
 * Returns unsubscribe function.
 */
export const subscribeCategoryLimits = (userId, onUpdate, onError) => {
  const q = query(collection(db, COL), where('userId', '==', userId));

  return onSnapshot(
    q,
    (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        map[data.category] = { id: d.id, ...data };
      });
      onUpdate(map);
    },
    onError ?? console.error
  );
};

// ── Write ─────────────────────────────────────────────────

/**
 * Upsert a category limit.
 * If a document for this (userId, category) already exists it is
 * updated in-place; otherwise a new document is created.
 * This keeps the collection clean — max one doc per category per user.
 */
export const setCategoryLimit = async (userId, category, limitAmount) => {
  const amount = Number(limitAmount);
  if (!amount || amount <= 0) throw new Error('Limit must be a positive number');

  // Check for existing doc
  const existing = await getDocs(
    query(
      collection(db, COL),
      where('userId',   '==', userId),
      where('category', '==', category)
    )
  );

  if (!existing.empty) {
    // Update
    await updateDoc(existing.docs[0].ref, {
      limitAmount: amount,
      updatedAt:   serverTimestamp(),
    });
    return existing.docs[0].id;
  }

  // Create
  const ref = await addDoc(collection(db, COL), {
    userId,
    category,
    limitAmount: amount,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });
  return ref.id;
};

/**
 * Delete a limit document by its Firestore document id.
 */
export const removeCategoryLimit = async (docId) => {
  if (!docId) throw new Error('Document id is required');
  await deleteDoc(doc(db, COL, docId));
};

/**
 * Delete a limit by (userId, category) — convenience overload used
 * when you only know the category string, not the doc id.
 */
export const removeLimitByCategory = async (userId, category) => {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where('userId',   '==', userId),
      where('category', '==', category)
    )
  );
  const batch = snap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(batch);
};
