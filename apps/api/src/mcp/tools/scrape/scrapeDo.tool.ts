import { z } from 'zod';
import type { MCPTool } from '../types';

function requireToken(): string {
  const token = process.env.SCRAPE_DO_API_KEY;
  if (!token) throw new Error('SCRAPE_DO_API_KEY not set');
  return token;
}

export const scrapeDoTool: MCPTool = {
  name: 'web.scrape',
  description:
    'Fetches public web pages via Scrape.do (handles anti-bot). Returns raw text or markdown.',
  argsSchema: z.object({
    url: z.string().min(1),
    render: z.boolean().optional(),
    device: z.enum(['desktop', 'mobile', 'tablet']).optional(),
    geoCode: z.string().optional(),
    timeout: z.number().optional(),
    output: z.enum(['raw', 'markdown']).optional(),
    blockResources: z.boolean().optional(),
    returnJSON: z.boolean().optional(),
  }),
  schema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      render: { type: 'boolean' },
      device: { type: 'string', enum: ['desktop', 'mobile', 'tablet'] },
      geoCode: { type: 'string' },
      timeout: { type: 'number' },
      output: { type: 'string', enum: ['raw', 'markdown'] },
      blockResources: { type: 'boolean' },
      returnJSON: { type: 'boolean' },
    },
    required: ['url'],
  },
  run: async (args) => {
    const token = requireToken();
    const url = String(args.url);

    const params = new URLSearchParams();
    params.set('token', token);
    params.set('url', url);

    if (typeof args.render === 'boolean') params.set('render', String(args.render));
    if (args.device) params.set('device', args.device);
    if (args.geoCode) params.set('geoCode', args.geoCode);
    if (typeof args.timeout === 'number') params.set('timeout', String(args.timeout));
    if (args.output) params.set('output', args.output);
    if (typeof args.blockResources === 'boolean') params.set('blockResources', String(args.blockResources));
    if (typeof args.returnJSON === 'boolean') params.set('returnJSON', String(args.returnJSON));

    const endpoint = `https://api.scrape.do/?${params.toString()}`;

    const res = await fetch(endpoint);
    const contentType = res.headers.get('content-type') ?? '';
    const text = await res.text();

    if (!res.ok) {
      throw new Error(`Scrape.do error ${res.status}: ${text.slice(0, 300)}`);
    }

    let data: any = text;
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch {}
    }

    return {
      tool_call: {
        tool: 'web.scrape',
        args,
        status: 'success',
        result: { status: res.status, contentType },
      },
      data,
      citations: [
        {
          doc_id: url,
          doc_title: 'Web source',
          supporting_span: 'Fetched via Scrape.do',
          supports: 'claim',
          confidence: 0.7,
          url,
        },
      ],
    };
  },
};
