'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, linkWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth, googleProvider, ensureAnonymousAuth } from '@/lib/firebase/client';
import { useAuthStore, type AppUser } from '@/lib/stores/useAuthStore';

interface AuthActions {
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthActions | undefined>(undefined);

function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    email: user.email,
    isAnonymous: user.isAnonymous,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      useAuthStore.getState().setUser(user ? toAppUser(user) : null);
      useAuthStore.getState().setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const current = auth.currentUser;
    if (current && current.isAnonymous) {
      try {
        await linkWithPopup(current, googleProvider);
        return;
      } catch (err) {
        // This Google account already has its own Firebase user (signed in
        // elsewhere before) -- fall through to a direct sign-in, which
        // switches to that uid instead of upgrading the current anonymous
        // one. Any other error should surface to the caller.
        if ((err as { code?: string })?.code !== 'auth/credential-already-in-use') throw err;
      }
    }
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await firebaseSignOut(auth);
    await ensureAnonymousAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.authReady);
  return { user, authReady, ...context };
}
