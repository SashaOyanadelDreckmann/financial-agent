import { create } from 'zustand';

/**
 * En frontend usamos string para no acoplar
 * directamente al tipo del backend.
 */
export type InterviewBlockId = string;

/**
 * Intake inicial COMPLETO y seguro.
 * Se clona explícitamente para evitar mutaciones compartidas.
 */
const DEFAULT_INTAKE = {
  age: undefined as number | undefined,

  employmentStatus: 'employed' as
    | 'employed'
    | 'freelance'
    | 'unemployed',
  profession: undefined as string | undefined,
  incomeBand: '500k-1M' as
    | '<500k'
    | '500k-1M'
    | '1M-2M'
    | '>2M',
  exactMonthlyIncome: undefined as number | undefined,

  expensesCoverage: 'tight' as
    | 'surplus'
    | 'tight'
    | 'sometimes'
    | 'no',
  tracksExpenses: 'sometimes' as
    | 'yes'
    | 'sometimes'
    | 'no',

  hasSavingsOrInvestments: false,
  savingsBand: undefined as
    | 'none'
    | '<300k'
    | '300k-1M'
    | '1M-3M'
    | '>3M'
    | undefined,
  exactSavingsAmount: undefined as number | undefined,

  hasDebt: false,

  financialProducts: [] as any[],

  financialKnowledge: {
    interest: false,
    CAE: false, 
    inflation: false,
    creditCard: false,
    creditLine: false,
    loanComponents: false,
    interestRate: false,
    liquidity: false,
    returnConcept: false,
    diversification: false,
    assetVsLiability: false,
    financialRisk: false,
    capitalMarkets: false,
    alternativeInvestments: false,
    fintech: false,
  },

  riskReaction: 'hold' as
    | 'sell'
    | 'hold'
    | 'buy_more'
    | 'never_invest'
    | 'other',
  riskReactionOther: undefined as string | undefined,

  selfRatedUnderstanding: 4,
  moneyStressLevel: 5,
};

type InterviewState = {
  /** Intake validado */
  intake: typeof DEFAULT_INTAKE;

  /** Bloque activo */
  currentBlockId?: InterviewBlockId;

  /** Respuestas locales por bloque */
  answersByBlock: Record<InterviewBlockId, string[]>;

  /** Evidencia FINAL cerrada (fuente de verdad backend) */
  completedBlocks: Record<InterviewBlockId, any>;

  /** Última respuesta cruda del backend */
  lastResponse?: any;

  /** Actions */
  setIntake: (intake: Partial<typeof DEFAULT_INTAKE>) => void;
  setResponse: (response: any) => void;
  addAnswer: (blockId: InterviewBlockId, answer: string) => void;
  resetBlock: (blockId: InterviewBlockId) => void;
  resetInterview: () => void;
};

export const useInterviewStore = create<InterviewState>((set) => ({
  /**
   * Estado inicial
   */
  intake: JSON.parse(JSON.stringify(DEFAULT_INTAKE)),

  currentBlockId: undefined,

  answersByBlock: {},
  completedBlocks: {},

  lastResponse: undefined,

  /**
   * Actions
   */

  /**
   * Intake solo se setea una vez
   */
  setIntake: (intakePatch) =>
    set((s) => ({
      intake: {
        ...s.intake,
        ...intakePatch,
      },
    })),

  /**
   * Punto CRÍTICO de sincronización con backend
   */
  setResponse: (response) =>
    set((s) => {
      const incomingCompleted = response?.completedBlocks;

      return {
        lastResponse: response,

        // solo cambia si backend manda blockId
        currentBlockId:
          response?.blockId ??
          s.currentBlockId,

        // MERGE defensivo (nunca borrar lo ya cerrado)
        completedBlocks: incomingCompleted
          ? {
              ...s.completedBlocks,
              ...incomingCompleted,
            }
          : s.completedBlocks,
      };
    }),

  /**
   * Guarda respuestas locales (solo UI)
   */
  addAnswer: (blockId, answer) =>
    set((s) => ({
      answersByBlock: {
        ...s.answersByBlock,
        [blockId]: [
          ...(s.answersByBlock[blockId] ?? []),
          answer,
        ],
      },
    })),

  /**
   * Limpia SOLO el bloque que viene
   */
  resetBlock: (blockId) =>
    set((s) => ({
      answersByBlock: {
        ...s.answersByBlock,
        [blockId]: [],
      },
    })),

  /**
   * Reset TOTAL (útil para reiniciar diagnóstico)
   */
  resetInterview: () =>
    set({
      intake: JSON.parse(JSON.stringify(DEFAULT_INTAKE)),
      currentBlockId: undefined,
      answersByBlock: {},
      completedBlocks: {},
      lastResponse: undefined,
    }),
}));
