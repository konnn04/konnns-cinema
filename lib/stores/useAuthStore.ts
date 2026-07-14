import { create } from 'zustand';

export interface AppUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  isAnonymous: boolean;
}

interface AuthState {
  user: AppUser | null;
  authReady: boolean;
  setUser: (user: AppUser | null) => void;
  setAuthReady: (ready: boolean) => void;
}

// Not persisted -- Firebase's own auth persistence (IndexedDB) is the
// source of truth; this just mirrors the current onAuthStateChanged user so
// components can read it reactively (see hooks/useAuth.tsx).
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  authReady: false,
  setUser: (user) => set({ user }),
  setAuthReady: (ready) => set({ authReady: ready }),
}));
