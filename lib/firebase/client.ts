import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, type Auth, type User } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp | null {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

// Watch Party is entirely client-driven (no server component ever reads
// Firebase), but `WatchPartyProvider` still gets server-rendered as part of
// every page's initial HTML since it's mounted in the root layout. Guarding
// initialization behind `typeof window` keeps a missing/invalid config from
// crashing SSR/build for the whole site -- `auth`/`db` are only ever
// dereferenced from browser-only effects and event handlers in
// hooks/useWatchParty.tsx, so the server-side `null` is never touched.
const app: FirebaseApp | null = typeof window !== 'undefined' ? getFirebaseApp() : null;
export const auth = (app ? getAuth(app) : null) as Auth;
export const db = (app ? getDatabase(app) : null) as Database;
export const googleProvider = new GoogleAuthProvider();

/**
 * Watch Party's whole identity model rests on Firebase Anonymous Auth: the
 * SDK persists the signed-in uid in IndexedDB, so it survives reloads/tabs
 * without us needing a session cookie or a server to issue one. Resolves
 * once a uid is available (waits for a real sign-in on first visit).
 */
export function ensureAnonymousAuth(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        } else {
          signInAnonymously(auth).catch((err) => {
            unsubscribe();
            reject(err);
          });
        }
      },
      reject
    );
  });
}
