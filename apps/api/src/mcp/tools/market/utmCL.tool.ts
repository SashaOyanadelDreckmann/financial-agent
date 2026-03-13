import { z } from 'zod';
import type { MCPTool } from '../types';
import { fetchIndicador } from './mindicadorClient';

export const utmCLTool: MCPTool = {
  name: 'market.utm_cl',
  description: 'Gets UTM (Chile) latest value with citation.',
  argsSchema: z.object({}),
  schema: { type: 'object', properties: {}, required: [] },
  run: async () => {
    const out = await fetchIndicador('utm');

    return {
      tool_call: {
        tool: 'market.utm_cl',
        args: {},
        status: 'success',
        result: {
          value: out.valor,
          unit: out.unidad,
          date: out.fecha,
        },
      },
      data: {
        value: out.valor,
        unit: out.unidad,
        date: out.fecha,
      },
      citations: [
        {
          doc_id: out.url,
          doc_title: 'mindicador.cl',
          supporting_span: out.valor ? `UTM: ${out.valor}` : 'No value parsed',
          supports: 'claim',
          confidence: out.valor ? 0.85 : 0.5,
          url: out.url,
        },
      ],
    };
  },
};
