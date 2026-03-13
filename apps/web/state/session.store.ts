import { create } from 'zustand';

type SessionState = {
  isAuthenticated: boolean;
  setAuthenticated: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: () => set({ isAuthenticated: true }),
}));