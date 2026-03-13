import { z } from 'zod';
import type { MCPTool } from '../types';

export const todayTool: MCPTool = {
  name: 'time.today',
  description: 'Returns today date in ISO (YYYY-MM-DD) and timezone offset.',
  argsSchema: z.object({
    tzOffsetMinutes: z.number().optional(), // if provided, compute date in that offset
  }),
  schema: {
    type: 'object',
    properties: { tzOffsetMinutes: { type: 'number' } },
    required: [],
  },
  run: async (args) => {
    const offsetMin =
      typeof args.tzOffsetMinutes === 'number'
        ? Math.trunc(args.tzOffsetMinutes)
        : null;

    const now = new Date();
    const ms = offsetMin === null
      ? now.getTime()
      : now.getTime() + (offsetMin * 60_000) - (now.getTimezoneOffset() * 60_000);

    const d = new Date(ms);
    const iso = d.toISOString().slice(0, 10);

    return {
      tool_call: { tool: 'time.today', args, status: 'success', result: { date: iso } },
      data: { date: iso, tzOffsetMinutes: offsetMin ?? -now.getTimezoneOffset() },
    };
  },
};
