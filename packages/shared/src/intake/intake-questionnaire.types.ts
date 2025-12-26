// packages/shared/src/intake/intake-questionnaire.types.ts
export type EmploymentStatus =
  | 'employed'
  | 'freelance'
  | 'unemployed';

export type IncomeBand =
  | '<500k'
  | '500k-1M'
  | '1M-2M'
  | '>2M';

export type ExpensesCoverage =
  | 'surplus'
  | 'tight'
  | 'sometimes'
  | 'no';

export type ExpenseTracking =
  | 'yes'
  | 'sometimes'
  | 'no';

export type SavingsBand =
  | 'none'
  | '<300k'
  | '300k-1M'
  | '1M-3M'
  | '>3M';

export type RiskReaction =
  | 'sell'
  | 'hold'
  | 'buy_more'
  | 'never_invest'
  | 'other';

export interface FinancialProductEntry {
  product: string;
  institution?: string;
  notes?: string;
  acquisitionCost?: number;
  monthlyCost?: number;
  anualCost?: number;
}

export interface FinancialKnowledgeChecklist {
  interest: boolean;
  CAE: boolean;
  inflation: boolean;
  creditCard: boolean;
  creditLine: boolean;
  loanComponents: boolean;
  interestRate: boolean;
  liquidity: boolean;
  returnConcept: boolean;
  diversification: boolean;
  assetVsLiability: boolean;
  financialRisk: boolean;
  capitalMarkets: boolean;
  alternativeInvestments: boolean;
  fintech: boolean;
}

export interface IntakeQuestionnaire {
  age?: number;

  employmentStatus: EmploymentStatus;
  profession?: string;

  incomeBand: IncomeBand;
  exactMonthlyIncome?: number;

  expensesCoverage: ExpensesCoverage;
  tracksExpenses: ExpenseTracking;

  hasSavingsOrInvestments: boolean;
  savingsBand?: SavingsBand;
  exactSavingsAmount?: number;

  hasDebt: boolean;

  financialProducts: FinancialProductEntry[];

  financialKnowledge: FinancialKnowledgeChecklist;

  riskReaction: RiskReaction;
  riskReactionOther?: string;

  selfRatedUnderstanding: number; // 0–10
  moneyStressLevel: number; // 0–10
}
