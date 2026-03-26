import { z } from 'zod';
import type { MCPTool } from '../types';

type SearchHit = {
  title: string;
  url: string;
  snippet?: string;
};

function decodeHtml(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(input: string): string {
  return decodeHtml(input.replace(/<[^>]+>/g, ' '));
}

function unwrapDuckDuckGoRedirect(href: string): string {
  try {
    const parsed = new URL(href, 'https://duckduckgo.com');
    if (!parsed.pathname.startsWith('/l/')) return href;
    const target = parsed.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : href;
  } catch {
    return href;
  }
}

function parseSearchResults(html: string, limit: number): SearchHit[] {
  const blocks = html.split('class="result"');
  const hits: SearchHit[] = [];

  for (const block of blocks) {
    if (hits.length >= limit) break;

    const linkMatch = block.match(
      /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );
    if (!linkMatch) continue;

    const rawHref = decodeHtml(linkMatch[1]);
    const url = unwrapDuckDuckGoRedirect(rawHref);
    const title = stripTags(linkMatch[2]);
    if (!url || !title) continue;

    const snippetMatch = block.match(
      /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i
    );
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : undefined;

    hits.push({ title, url, snippet });
  }

  return hits;
}

export const webSearchTool: MCPTool = {
  name: 'web.search',
  description:
    'Busca en internet por texto libre y retorna resultados con enlaces y resumen.',
  argsSchema: z.object({
    query: z.string().min(2),
    limit: z.number().int().min(1).max(10).optional().default(5),
  }),
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'number' },
    },
    required: ['query'],
  },
  run: async (args) => {
    const query = String(args.query);
    const limit = Number(args.limit ?? 5);
    const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinancialAgent/1.0)',
      },
    });

    const html = await res.text();
    if (!res.ok) {
      throw new Error(`web.search failed (${res.status})`);
    }

    const results = parseSearchResults(html, limit);

    return {
      tool_call: {
        tool: 'web.search',
        args,
        status: 'success',
        result: {
          total: results.length,
          query,
        },
      },
      data: {
        query,
        total: results.length,
        results,
      },
      citations: results.slice(0, 3).map((r) => ({
        doc_id: r.url,
        doc_title: r.title,
        supporting_span: r.snippet ?? 'Resultado de busqueda web',
        supports: 'claim' as const,
        confidence: 0.65,
        url: r.url,
      })),
    };
  },
};
