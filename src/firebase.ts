import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCv-jOCxLQhHPqhpfQGEALj5qcEhIydZk8",
  authDomain: "jate-cb4e1.firebaseapp.com",
  projectId: "jate-cb4e1",
  storageBucket: "jate-cb4e1.firebasestorage.app",
  messagingSenderId: "272724556404",
  appId: "1:272724556404:web:d4e16d6f1e72302e43ef21",
};

// Guard against double-initialization when both firebase.js and firebase.ts are present
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

export const storage = getStorage(app);
