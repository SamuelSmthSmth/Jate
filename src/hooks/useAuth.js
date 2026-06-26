// src/hooks/useAuth.js
import { useState, useEffect } from "react";
import { auth, db, provider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Helper to generate a unique random friend code
const generateFriendCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        let userData = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        };

        if (!userSnap.exists()) {
          // New user setup: assign them a permanent friend code
          userData.friendCode = generateFriendCode();
          await setDoc(userRef, userData);
        } else {
          userData = userSnap.data();
        }

        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  return { user, loading, loginWithGoogle, logout };
}