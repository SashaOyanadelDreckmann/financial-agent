import { z } from 'zod';
import type { MCPTool } from '../types';
import { generateSimulationPdf } from '../../../services/simulations/simulation.service';

export const generateSimulationPdfTool: MCPTool = {
  name: 'pdf.generate_simulation',
  description: 'Genera un PDF de simulación financiera con gráfico',

  argsSchema: z.object({
    principal: z.number(),
    annualRate: z.number(),
    months: z.number().optional(),
    monthlyContribution: z.number().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    executiveSummary: z.string().optional(),
    keyFindings: z.array(z.string()).optional(),
    assumptions: z.array(z.string()).optional(),
    contextHighlights: z.array(z.string()).optional(),
  }),

  schema: {
    type: 'object',
    properties: {
      principal: { type: 'number' },
      annualRate: { type: 'number' },
      months: { type: 'number' },
      monthlyContribution: { type: 'number' },
      title: { type: 'string' },
      subtitle: { type: 'string' },
      executiveSummary: { type: 'string' },
      keyFindings: { type: 'array', items: { type: 'string' } },
      assumptions: { type: 'array', items: { type: 'string' } },
      contextHighlights: { type: 'array', items: { type: 'string' } },
    },
    required: ['principal', 'annualRate'],
  },

  run: async (args) => {
    const artifact = await generateSimulationPdf({
      principal: args.principal,
      annualRate: args.annualRate,
      months: args.months ?? 12,
      monthlyContribution: args.monthlyContribution ?? 0,
      title: args.title,
      subtitle: args.subtitle,
      executiveSummary: args.executiveSummary,
      keyFindings: args.keyFindings,
      assumptions: args.assumptions,
      contextHighlights: args.contextHighlights,
    });

    return {
      tool_call: {
        tool: 'pdf.generate_simulation',
        args,
        status: 'success',
        result: { artifact_id: artifact.id },
      },
      data: artifact,
    };
  },
};
