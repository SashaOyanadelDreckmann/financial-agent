import { z } from 'zod';
import type { MCPTool } from '../types';
import { fetchIndicador } from './mindicadorClient';

export const dollarCLTool: MCPTool = {
  name: 'market.fx_usd_clp',
  description: 'Gets USD/CLP value for Chile (latest) with source citation.',
  argsSchema: z.object({}),
  schema: { type: 'object', properties: {}, required: [] },
  run: async () => {
    const out = await fetchIndicador('dolar');

    return {
      tool_call: {
        tool: 'market.fx_usd_clp',
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
          supporting_span: out.valor ? `USD/CLP: ${out.valor}` : 'No value parsed',
          supports: 'claim',
          confidence: out.valor ? 0.85 : 0.5,
          url: out.url,
        },
      ],
    };
  },
};
