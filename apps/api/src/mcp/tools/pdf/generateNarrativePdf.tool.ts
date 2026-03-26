import { z } from 'zod';
import type { MCPTool } from '../types';
import { generateNarrativePdf } from '../../../services/simulations/simulation.service';

export const generateNarrativePdfTool: MCPTool = {
  name: 'pdf.generate_report',
  description: 'Genera un PDF narrativo profesional, no basado en simulación.',

  argsSchema: z.object({
    title: z.string().min(3),
    subtitle: z.string().optional(),
    style: z.enum(['corporativo', 'minimalista', 'tecnico']).optional(),
    source: z.enum(['analysis', 'diagnostic', 'simulation']).optional(),
    sections: z
      .array(
        z.object({
          heading: z.string().min(2),
          body: z.string().min(8),
        })
      )
      .optional(),
    tables: z
      .array(
        z.object({
          title: z.string().min(2),
          columns: z.array(z.string()).min(1),
          rows: z.array(z.array(z.union([z.string(), z.number()]))).default([]),
          align: z.array(z.enum(['left', 'center', 'right'])).optional(),
        })
      )
      .optional(),
    charts: z
      .array(
        z.object({
          title: z.string().min(2),
          subtitle: z.string().optional(),
          kind: z.enum(['line', 'bar', 'area']).optional(),
          labels: z.array(z.string()).min(1),
          values: z.array(z.number()).min(1),
        })
      )
      .optional(),
  }),

  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      subtitle: { type: 'string' },
      style: { type: 'string', enum: ['corporativo', 'minimalista', 'tecnico'] },
      source: { type: 'string', enum: ['analysis', 'diagnostic', 'simulation'] },
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            body: { type: 'string' },
          },
          required: ['heading', 'body'],
        },
      },
      tables: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            columns: { type: 'array', items: { type: 'string' } },
            rows: {
              type: 'array',
              items: {
                type: 'array',
                items: {
                  anyOf: [{ type: 'string' }, { type: 'number' }],
                },
              },
            },
            align: {
              type: 'array',
              items: { type: 'string', enum: ['left', 'center', 'right'] },
            },
          },
          required: ['title', 'columns', 'rows'],
        },
      },
      charts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
            kind: { type: 'string', enum: ['line', 'bar', 'area'] },
            labels: { type: 'array', items: { type: 'string' } },
            values: { type: 'array', items: { type: 'number' } },
          },
          required: ['title', 'labels', 'values'],
        },
      },
    },
    required: ['title'],
  },

  run: async (args) => {
    const artifact = await generateNarrativePdf({
      title: args.title,
      subtitle: args.subtitle,
      style: args.style,
      source: args.source,
      sections: args.sections,
      tables: args.tables,
      charts: args.charts,
    });

    return {
      tool_call: {
        tool: 'pdf.generate_report',
        args,
        status: 'success',
        result: { artifact_id: artifact.id },
      },
      data: artifact,
    };
  },
};

