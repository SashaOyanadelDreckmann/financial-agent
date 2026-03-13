import { create } from 'zustand';

export interface FinancialProfileTraits {
  financialClarity: 'low' | 'medium' | 'high';
  decisionStyle:
    | 'reactive'
    | 'analytical'
    | 'avoidant'
    | 'delegated'
    | 'mixed';
  timeHorizon: 'short_term' | 'mixed' | 'long_term';
  financialPressure: 'low' | 'moderate' | 'high';
  emotionalPattern:
    | 'neutral'
    | 'anxious'
    | 'avoidant'
    | 'controlling'
    | 'conflicted';
  coherenceScore: number;
}

export interface FinancialDiagnosticProfile {
  diagnosticNarrative: string;
  profile: FinancialProfileTraits;
  tensions: string[];
  hypotheses: string[];
  openQuestions: string[];
}

interface ProfileState {
  profile: FinancialDiagnosticProfile | null;
  loading: boolean;
  error: string | null;

  loadProfileIfNeeded: () => Promise<void>;
  setProfile: (profile: FinancialDiagnosticProfile) => void;
  clearProfile: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  async loadProfileIfNeeded() {
    if (get().profile || get().loading) return;

    try {
      set({ loading: true, error: null });

      // ✅ RUTA CORRECTA
      const res = await fetch('/diagnosis/latest');

      if (!res.ok) {
        throw new Error('No se pudo cargar el diagnóstico');
      }

      const data = await res.json();

      set({
        profile: data,
        loading: false,
      });
    } catch (err: any) {
      set({
        error:
          err?.message ??
          'Error inesperado cargando diagnóstico',
        loading: false,
      });
    }
  },

  setProfile(profile) {
    set({ profile });
  },

  clearProfile() {
    set({ profile: null, error: null });
  },
}));