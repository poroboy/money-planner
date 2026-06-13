import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(ref);
        const payload = {
          userId: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          lastLoginAt: serverTimestamp(),
        };

        if (!snap.exists()) {
          await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
        } else {
          await setDoc(ref, payload, { merge: true });
        }
      }
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setAuthError('');
    try {
      if (isMobile()) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error(error);
      setAuthError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, loading, authError, loginWithGoogle, logout };
}
