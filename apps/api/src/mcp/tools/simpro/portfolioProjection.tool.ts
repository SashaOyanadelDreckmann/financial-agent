import { z } from 'zod';
import type { MCPTool } from '../types';

function normRate(x: number) {
  return x > 1 ? x / 100 : x;
}

export const portfolioProjectionTool: MCPTool = {
  name: 'finance.project_portfolio',
  description: 'Projects portfolio value over time with fixed contributions.',
  argsSchema: z.object({
    initial: z.number().optional(),
    monthly: z.number().optional(),
    months: z.number().int().optional(),
    annualRate: z.number().optional(),
  }),
  run: async (args) => {
    const missing: string[] = [];
    if (typeof args.initial !== 'number') missing.push('initial');
    if (typeof args.monthly !== 'number') missing.push('monthly');
    if (typeof args.months !== 'number') missing.push('months');
    if (typeof args.annualRate !== 'number') missing.push('annualRate');

    if (missing.length) {
      return {
        tool_call: {
          tool: 'finance.project_portfolio',
          args,
          status: 'success',
          result: { requested: missing },
        },
        data: { requested: missing },
      };
    }

    const initial = Number(args.initial);
    const monthly = Number(args.monthly);
    const months = Math.max(1, Math.floor(Number(args.months)));
    const r = normRate(Number(args.annualRate)) / 12;

    let balance = initial;
    let contributed = initial;

    const series = [];
    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + r) + monthly;
      contributed += monthly;
      series.push({
        month: m,
        balance: Number(balance.toFixed(2)),
        contributed: Number(contributed.toFixed(2)),
      });
    }

    const last = series[series.length - 1];
    if (!last) throw new Error('Portfolio projection produced no results');

    const summary = {
      final_balance: last.balance,
      total_contributed: last.contributed,
      total_growth: Number((last.balance - last.contributed).toFixed(2)),
    };

    return {
      tool_call: {
        tool: 'finance.project_portfolio',
        args,
        status: 'success',
        result: summary,
      },
      data: { summary, series },
    };
  },
};
