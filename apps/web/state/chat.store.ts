import { create } from 'zustand';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type AgentState = {
  messages: Message[];
  addMessage: (m: Message) => void;
  reset: () => void;
};

export const useAgentStore = create<AgentState>((set) => ({
  messages: [],
  addMessage: (m) =>
    set((s) => ({ messages: [...s.messages, m] })),
  reset: () => set({ messages: [] }),
}));
