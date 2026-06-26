// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCv-jOCxLQhHPqhpfQGEALj5qcEhIydZk8",
  authDomain: "jate-cb4e1.firebaseapp.com",
  projectId: "jate-cb4e1",
  storageBucket: "jate-cb4e1.firebasestorage.app",
  messagingSenderId: "272724556404",
  appId: "1:272724556404:web:d4e16d6f1e72302e43ef21"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);