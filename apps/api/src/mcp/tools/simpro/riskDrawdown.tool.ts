import { z } from 'zod';
import type { MCPTool } from '../types';

function maxDrawdown(values: number[]) {
  let peak = values[0] ?? 0;
  let maxDD = 0;
  let peakIdx = 0;
  let troughIdx = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v > peak) {
      peak = v;
      peakIdx = i;
    }
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDD) {
      maxDD = dd;
      troughIdx = i;
    }
  }

  return {
    max_drawdown: Number(maxDD.toFixed(6)),
    peak_month: peakIdx + 1,
    trough_month: troughIdx + 1,
  };
}

export const riskDrawdownTool: MCPTool = {
  name: 'finance.risk_drawdown',
  description: "Computes maximum drawdown for a portfolio series.",
  argsSchema: z.object({
    series: z.array(z.object({ month: z.number().int().min(1), balance: z.number() })).optional(),
  }),
  run: async (args) => {
    if (!Array.isArray(args.series) || args.series.length < 2) {
      return {
        tool_call: { tool: 'finance.risk_drawdown', args, status: 'success', result: { requested: ['series'] } },
        data: { requested: ['series'] },
      };
    }

    const balances = args.series.map((p: any) => Number(p.balance));
    const dd = maxDrawdown(balances);    return {
      tool_call: { tool: 'finance.risk_drawdown', args, status: 'success', result: dd },
      data: { drawdown: dd },
    };
  },
};
