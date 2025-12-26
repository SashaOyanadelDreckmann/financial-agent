// apps/api/src/agents/intake/intake-analyzer.ts

import { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';

export interface IntakeSignals {
  hasIncomeInstability: boolean;
  hasCashflowStress: boolean;
  lacksEmergencyFund: boolean;
  hasDebtBurden: boolean;
  lowFinancialKnowledge: boolean;
  highMoneyStress: boolean;
  avoidsRisk: boolean;
}

export function analyzeIntake(
  intake: IntakeQuestionnaire
): IntakeSignals {
  return {
    hasIncomeInstability:
      intake.employmentStatus === 'freelance' ||
      intake.employmentStatus === 'unemployed',

    hasCashflowStress:
      intake.expensesCoverage === 'sometimes' ||
      intake.expensesCoverage === 'no',

    lacksEmergencyFund:
      !intake.hasSavingsOrInvestments ||
      intake.savingsBand === 'none',

    hasDebtBurden:
      intake.hasDebt,

    lowFinancialKnowledge:
      Object.values(intake.financialKnowledge).filter(Boolean).length <= 5,

    highMoneyStress:
      intake.moneyStressLevel >= 6,

    avoidsRisk:
      intake.riskReaction === 'never_invest',
  };
}
