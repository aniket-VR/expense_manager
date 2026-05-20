// services/authService.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { seedDefaultAccounts } from './accountService';

export const registerUser = async (name, email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, 'users', user.uid), {
    userId: user.uid,
    name,
    email,
    dailyLimit: 500,
    createdAt: serverTimestamp(),
  });

  // Seed the five default accounts for new users
  await seedDefaultAccounts(user.uid);

  return user;
};

export const loginUser = async (email, password) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  // Seed accounts for legacy users who signed up before accounts existed
  await seedDefaultAccounts(user.uid);
  return user;
};

export const logoutUser = () => signOut(auth);

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};
