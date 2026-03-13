import { z } from 'zod';
import type { MCPTool } from '../types';

function normRate(x: number) {
  return x > 1 ? x / 100 : x;
}

function project(initial: number, monthly: number, months: number, annualRate: number) {
  const r = annualRate / 12;
  let balance = initial;
  const out: Array<{ month: number; balance: number }> = [];
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + r) + monthly;
    out.push({ month: m, balance: Number(balance.toFixed(2)) });
  }
  return out;
}

export const scenarioProjectionTool: MCPTool = {
  name: 'finance.scenario_projection',
  description: "Projects portfolio outcomes under multiple rate scenarios.",
  argsSchema: z.object({
    initial: z.number().optional(),
    monthly: z.number().optional(),
    months: z.number().int().optional(),
    annualRatePessimistic: z.number().optional(),
    annualRateBase: z.number().optional(),
    annualRateOptimistic: z.number().optional(),
  }),
  run: async (args) => {
    const missing: string[] = [];
    if (typeof args.initial !== 'number') missing.push('initial (capital inicial)');
    if (typeof args.monthly !== 'number') missing.push('monthly (aporte mensual)');
    if (typeof args.months !== 'number') missing.push('months (horizonte en meses)');
    if (typeof args.annualRatePessimistic !== 'number') missing.push('annualRatePessimistic (tasa pesimista)');
    if (typeof args.annualRateBase !== 'number') missing.push('annualRateBase (tasa base)');
    if (typeof args.annualRateOptimistic !== 'number') missing.push('annualRateOptimistic (tasa optimista)');

    if (missing.length) {
      return {
        tool_call: { tool: 'finance.scenario_projection', args, status: 'success', result: { requested: missing } },
        data: { requested: missing },
      };
    }

    const initial = Number(args.initial);
    const monthly = Number(args.monthly);
    const months = Math.max(1, Math.floor(Number(args.months)));

    const pess = normRate(Number(args.annualRatePessimistic));
    const base = normRate(Number(args.annualRateBase));
    const opt  = normRate(Number(args.annualRateOptimistic));

    const sP = project(initial, monthly, months, pess).map((p) => ({ ...p, scenario: 'Pesimista' }));
    const sB = project(initial, monthly, months, base).map((p) => ({ ...p, scenario: 'Base' }));
    const sO = project(initial, monthly, months, opt ).map((p) => ({ ...p, scenario: 'Optimista' }));

    const series = [...sP, ...sB, ...sO];

    const lastP = sP[sP.length - 1];
const lastB = sB[sB.length - 1];
const lastO = sO[sO.length - 1];

if (!lastP || !lastB || !lastO) {
  throw new Error('Scenario projection produced no results');
}

const summary = {
  pess_final: lastP.balance,
  base_final: lastB.balance,
  opt_final:  lastO.balance,
};    return {
      tool_call: { tool: 'finance.scenario_projection', args, status: 'success', result: summary },
      data: { summary, series },
    };
  },
};
