import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

import {
  getDatabase
} from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLS3dyc4am5z6h-0MhcWKPxwV-7u26qyA",
  authDomain: "chatroom-e11a6.firebaseapp.com",
  databaseURL: "https://chatroom-e11a6-default-rtdb.firebaseio.com",
  projectId: "chatroom-e11a6",
  storageBucket: "chatroom-e11a6.firebasestorage.app",
  messagingSenderId: "85722251439",
  appId: "1:85722251439:web:758b8ddccd4f720338d45a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);


// Keep authentication after page refresh
setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.error(
    "Auth persistence error:",
    error
  );
});