import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCmMYjwvl8JeEg6IOQ56ZDwGb3vToGgzKA",
  authDomain: "syntrix-ic.firebaseapp.com",
  projectId: "syntrix-ic",
  storageBucket: "syntrix-ic.firebasestorage.app",
  messagingSenderId: "1054966153898",
  appId: "1:1054966153898:web:462d134046221b2ece86d3",
  measurementId: "G-EDKBDRZ0CT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);