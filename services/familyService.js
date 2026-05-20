// services/familyService.js
// ─────────────────────────────────────────────────────────
// All Firestore operations for the Family Expense system.
//
// Collections used:
//   /families/{familyId}
//     familyId, familyName, createdBy, createdAt, memberCount
//
//   /familyInvites/{inviteCode}
//     familyId, familyName, createdBy, creatorName,
//     expiresAt, usedBy, usedAt, status ('active'|'used'|'expired')
//
//   /users/{uid}  (fields added)
//     familyId, role ('head'|'member'), familyName, joinedFamilyAt
//
// Design decisions:
//   • Invite codes are 8-char uppercase alphanumeric strings
//     generated client-side — collision probability is ~1 in
//     2.8 trillion for 8 chars from 36-char alphabet.
//   • Each invite doc expires after 7 days.
//   • Joining a family is a batch write: mark invite used +
//     update user doc atomically.
//   • Removing a member only clears their familyId/role —
//     their transactions stay scoped to their userId so
//     historical data is preserved.
//   • The Head can never be removed — they must delete the
//     family to leave.
// ─────────────────────────────────────────────────────────

import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, query, where, onSnapshot, writeBatch,
  serverTimestamp, Timestamp, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

const FAMILIES_COL = 'families';
const INVITES_COL  = 'familyInvites';
const USERS_COL    = 'users';

// ── Helpers ───────────────────────────────────────────────

/** Generate a random 8-char uppercase invite code. */
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

/** Return a Date 7 days from now. */
const sevenDaysFromNow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
};

// ── Family CRUD ───────────────────────────────────────────

/**
 * Create a new family. The creator becomes the Head.
 * Updates the user's doc with familyId + role = 'head'.
 *
 * @returns {string} the new familyId
 */
export const createFamily = async (userId, userName, familyName) => {
  if (!familyName?.trim()) throw new Error('Family name is required');

  const familyRef = doc(collection(db, FAMILIES_COL));
  const familyId  = familyRef.id;

  const batch = writeBatch(db);

  // Create family document
  batch.set(familyRef, {
    familyId,
    familyName:  familyName.trim(),
    createdBy:   userId,
    creatorName: userName,
    memberCount: 1,
    createdAt:   serverTimestamp(),
  });

  // Update creator's user doc
  batch.update(doc(db, USERS_COL, userId), {
    familyId,
    familyName:     familyName.trim(),
    role:           'head',
    joinedFamilyAt: serverTimestamp(),
  });

  await batch.commit();
  return familyId;
};

/**
 * Get a family document (one-shot read).
 */
export const getFamily = async (familyId) => {
  const snap = await getDoc(doc(db, FAMILIES_COL, familyId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

/**
 * Real-time subscription to a family document.
 */
export const subscribeFamily = (familyId, onUpdate, onError) => {
  if (!familyId) return () => {};
  return onSnapshot(
    doc(db, FAMILIES_COL, familyId),
    (snap) => onUpdate(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    onError ?? console.error
  );
};

/**
 * Update family name (Head only — enforced by Firestore rules).
 */
export const updateFamilyName = async (familyId, newName) => {
  if (!newName?.trim()) throw new Error('Name cannot be empty');
  await updateDoc(doc(db, FAMILIES_COL, familyId), {
    familyName: newName.trim(),
  });
};

/**
 * Delete the family entirely.
 * Removes familyId/role from ALL members.
 * Only the Head can call this (enforced by Firestore rules).
 */
export const deleteFamily = async (familyId) => {
  // Fetch all members
  const membersSnap = await getDocs(
    query(collection(db, USERS_COL), where('familyId', '==', familyId))
  );

  const batch = writeBatch(db);

  // Strip family fields from all members
  membersSnap.docs.forEach((d) => {
    batch.update(d.ref, {
      familyId:       null,
      familyName:     null,
      role:           null,
      joinedFamilyAt: null,
    });
  });

  // Delete all active invites for this family
  const invitesSnap = await getDocs(
    query(collection(db, INVITES_COL), where('familyId', '==', familyId))
  );
  invitesSnap.docs.forEach((d) => batch.delete(d.ref));

  // Delete the family document itself
  batch.delete(doc(db, FAMILIES_COL, familyId));

  await batch.commit();
};

// ── Member management ─────────────────────────────────────

/**
 * Real-time subscription to all members of a family.
 * Returns array of user profile objects.
 */
export const subscribeFamilyMembers = (familyId, onUpdate, onError) => {
  if (!familyId) { onUpdate([]); return () => {}; }

  return onSnapshot(
    query(collection(db, USERS_COL), where('familyId', '==', familyId)),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError ?? console.error
  );
};

/**
 * Remove a member from the family (Head action).
 * Clears their familyId/role without deleting their transactions.
 */
export const removeMember = async (memberUid) => {
  await updateDoc(doc(db, USERS_COL, memberUid), {
    familyId:       null,
    familyName:     null,
    role:           null,
    joinedFamilyAt: null,
  });
};

/**
 * Leave a family (Member action).
 * Same as removeMember but called by the member themselves.
 */
export const leaveFamily = async (userId) => removeMember(userId);

// ── Invite system ─────────────────────────────────────────

/**
 * Generate a new invite code for a family.
 * Returns the invite code string.
 * Expires in 7 days. Only Head can create invites (rules).
 */
export const createInvite = async (familyId, familyName, creatorId, creatorName) => {
  const code      = generateInviteCode();
  const inviteRef = doc(db, INVITES_COL, code);

  await setDoc(inviteRef, {
    code,
    familyId,
    familyName,
    createdBy:   creatorId,
    creatorName: creatorName || 'Family Head',
    status:      'active',
    expiresAt:   Timestamp.fromDate(sevenDaysFromNow()),
    usedBy:      null,
    usedAt:      null,
    createdAt:   serverTimestamp(),
  });

  return code;
};

/**
 * Look up an invite code and validate it.
 * Returns the invite doc or throws a user-friendly error.
 */
export const validateInvite = async (code) => {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) throw new Error('Enter an invite code');
  if (trimmed.length !== 8) throw new Error('Invite codes are 8 characters');

  const snap = await getDoc(doc(db, INVITES_COL, trimmed));
  if (!snap.exists()) throw new Error('Invalid invite code — double-check and try again');

  const invite = snap.data();
  if (invite.status === 'used')    throw new Error('This invite has already been used');
  if (invite.status === 'expired') throw new Error('This invite has expired');

  const expiresAt = invite.expiresAt?.toDate?.() ?? new Date(0);
  if (expiresAt < new Date()) throw new Error('This invite has expired');

  return invite;
};

/**
 * Join a family using an invite code.
 * Atomically: marks invite as used + updates user doc.
 */
export const joinFamilyWithCode = async (userId, code) => {
  const invite = await validateInvite(code);

  const batch = writeBatch(db);

  // Mark invite used
  batch.update(doc(db, INVITES_COL, code.trim().toUpperCase()), {
    status: 'used',
    usedBy: userId,
    usedAt: serverTimestamp(),
  });

  // Update user's profile
  batch.update(doc(db, USERS_COL, userId), {
    familyId:       invite.familyId,
    familyName:     invite.familyName,
    role:           'member',
    joinedFamilyAt: serverTimestamp(),
  });

  // Increment family member count
  batch.update(doc(db, FAMILIES_COL, invite.familyId), {
    memberCount: (invite.memberCount || 1) + 1,
  });

  await batch.commit();
  return invite;
};

/**
 * Subscribe to all active invites for a family (Head only).
 */
export const subscribeActiveInvites = (familyId, onUpdate, onError) => {
  if (!familyId) { onUpdate([]); return () => {}; }

  return onSnapshot(
    query(
      collection(db, INVITES_COL),
      where('familyId', '==', familyId),
      where('status',   '==', 'active'),
      orderBy('createdAt', 'desc')
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError ?? console.error
  );
};

/**
 * Revoke (delete) a pending invite code.
 */
export const revokeInvite = async (code) => {
  await deleteDoc(doc(db, INVITES_COL, code));
};
