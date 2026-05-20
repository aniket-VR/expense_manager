// hooks/useFamily.js
// ─────────────────────────────────────────────────────────
// Single hook that combines:
//   • Family document (name, createdBy, memberCount)
//   • All family members (real-time)
//   • Active invite codes (Head only, real-time)
//
// Reads familyId and role from the user's profile (already
// live in useAuth) — no extra Firestore read needed.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import {
  subscribeFamily,
  subscribeFamilyMembers,
  subscribeActiveInvites,
} from '../services/familyService';

const useFamily = (profile) => {
  const familyId = profile?.familyId || null;
  const role     = profile?.role     || null;
  const isHead   = role === 'head';
  const isMember = !!familyId;

  const [family,  setFamily]  = useState(null);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Family document ─────────────────────────────────────
  useEffect(() => {
    if (!familyId) { setFamily(null); setLoading(false); return; }

    const unsub = subscribeFamily(
      familyId,
      (data) => { setFamily(data); setLoading(false); },
      ()     => setLoading(false)
    );
    return () => unsub();
  }, [familyId]);

  // ── Members list ────────────────────────────────────────
  useEffect(() => {
    if (!familyId) { setMembers([]); return; }

    const unsub = subscribeFamilyMembers(
      familyId,
      setMembers,
      console.error
    );
    return () => unsub();
  }, [familyId]);

  // ── Active invites (Head only) ──────────────────────────
  useEffect(() => {
    if (!familyId || !isHead) { setInvites([]); return; }

    const unsub = subscribeActiveInvites(
      familyId,
      setInvites,
      console.error
    );
    return () => unsub();
  }, [familyId, isHead]);

  return {
    family,
    members,
    invites,
    loading,
    familyId,
    role,
    isHead,
    isMember,
  };
};

export default useFamily;
