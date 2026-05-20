// hooks/useAuth.js
// ─────────────────────────────────────────────────────────
// Subscribes to Firebase Auth state changes and exposes
// the current user + Firestore profile in a single hook.
// ─────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

/**
 * @returns {{
 *   user: FirebaseUser | null,
 *   profile: UserProfile | null,
 *   loading: boolean,
 * }}
 */
const useAuth = () => {
  const [user, setUser] = useState(null);       // Firebase Auth user object
  const [profile, setProfile] = useState(null); // Firestore user document
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;

    // Listen to Auth state
    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Cancel previous Firestore listener if switching accounts
      if (profileUnsub) profileUnsub();

      if (firebaseUser) {
        // Real-time listener for the user's Firestore profile
        profileUnsub = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile(snap.data());
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          () => {
            // Firestore error — still mark loading done
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  return { user, profile, loading };
};

export default useAuth;
