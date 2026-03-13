import { z } from 'zod';
import type { MCPTool } from '../types';
import { fetchWithScrapeDo } from './scrapeDoClient';
import { extractFirstMatch } from './extractors';

export const webExtractTool: MCPTool = {
  name: 'web.extract',
  description: 'Fetches a URL and extracts a value using a regex.',
  argsSchema: z.object({
    url: z.string().min(1),
    pattern: z.string().min(1),
    flags: z.string().optional().default('i'),
    render: z.boolean().optional(),
    output: z.enum(['raw', 'markdown']).optional(),
  }),
  schema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      pattern: { type: 'string' },
      flags: { type: 'string' },
      render: { type: 'boolean' },
      output: { type: 'string', enum: ['raw', 'markdown'] },
    },
    required: ['url', 'pattern'],
  },
  run: async (args) => {
    const url = String(args.url);
    const re = new RegExp(String(args.pattern), String(args.flags ?? 'i'));

    const fetched = await fetchWithScrapeDo({
      url,
      render: Boolean(args.render),
      output: args.output ?? 'raw',
      blockResources: true,
      returnJSON: false,
    });

    const hit = extractFirstMatch(fetched.text, re);

    return {
      tool_call: {
        tool: 'web.extract',
        args,
        status: 'success',
        result: { found: Boolean(hit), status: fetched.status },
      },
      data: {
        found: Boolean(hit),
        value: hit,
        status: fetched.status,
        contentType: fetched.contentType,
      },
      citations: [
        {
          doc_id: url,
          doc_title: new URL(url).hostname,
          supporting_span: hit ? `Extracted: ${hit}` : 'No match found',
          supports: 'claim',
          confidence: hit ? 0.75 : 0.4,
          url,
        },
      ],
    };
  },
};
