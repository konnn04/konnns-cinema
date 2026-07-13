import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdultContentState {
  verified: boolean;
  unblurEnabled: boolean;
  setVerified: () => void;
  setUnblurEnabled: (value: boolean) => void;
}

export const useAdultContentStore = create<AdultContentState>()(
  persist(
    (set) => ({
      verified: false,
      unblurEnabled: false,
      setVerified: () => set({ verified: true }),
      setUnblurEnabled: (value) => set({ unblurEnabled: value }),
    }),
    { name: 'cinema-adult-content' }
  )
);
