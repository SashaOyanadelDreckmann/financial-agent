import { z } from 'zod';
import type { MCPTool } from '../types';

function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function normRate(x: number) {
  return x > 1 ? x / 100 : x;
}

export const monteCarloTool: MCPTool = {
  name: 'finance.simulate_montecarlo',
  description: 'Runs a Monte Carlo simulation for an investment portfolio.',
  argsSchema: z.object({
    initial: z.number().optional(),
    monthly: z.number().optional(),
    months: z.number().int().optional(),
    annualReturn: z.number().optional(),
    annualVolatility: z.number().optional(),
    paths: z.number().int().min(200).max(20000).optional(),
  }),
  run: async (args) => {
    const missing: string[] = [];
    if (typeof args.initial !== 'number') missing.push('initial');
    if (typeof args.monthly !== 'number') missing.push('monthly');
    if (typeof args.months !== 'number') missing.push('months');
    if (typeof args.annualReturn !== 'number') missing.push('annualReturn');
    if (typeof args.annualVolatility !== 'number') missing.push('annualVolatility');

    if (missing.length) {
      return {
        tool_call: {
          tool: 'finance.simulate_montecarlo',
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
    const paths = typeof args.paths === 'number' ? args.paths : 5000;

    const mu = normRate(Number(args.annualReturn)) / 12;
    const sigma = normRate(Number(args.annualVolatility)) / Math.sqrt(12);

    const perMonth: number[][] = Array.from({ length: months }, () => []);

    for (let i = 0; i < paths; i++) {
      let value = initial;
      for (let m = 0; m < months; m++) {
        const r = clamp(mu + sigma * randomNormal(), -0.95, 3.0);
        value = value * (1 + r) + monthly;
        perMonth[m].push(value);
      }
    }

    const pct = (arr: number[], p: number) => {
      const a = arr.slice().sort((x, y) => x - y);
      return Number(a[Math.floor((p / 100) * (a.length - 1))].toFixed(2));
    };

    const series = perMonth.map((arr, i) => ({
      month: i + 1,
      p10: pct(arr, 10),
      p50: pct(arr, 50),
      p90: pct(arr, 90),
    }));

    const last = series[series.length - 1];
    if (!last) throw new Error('Monte Carlo simulation produced no results');

    const summary = {
      paths,
      p10_final: last.p10,
      p50_final: last.p50,
      p90_final: last.p90,
    };

    return {
      tool_call: {
        tool: 'finance.simulate_montecarlo',
        args,
        status: 'success',
        result: summary,
      },
      data: { summary, series },
    };
  },
};
