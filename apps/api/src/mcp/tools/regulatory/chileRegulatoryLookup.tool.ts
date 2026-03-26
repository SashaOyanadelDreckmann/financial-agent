import { z } from 'zod';
import type { MCPTool } from '../types';

type RegulatorySource = {
  title: string;
  url: string;
  tags: string[];
};

const REGULATORY_SOURCES: RegulatorySource[] = [
  {
    title: 'CMF - Glosario financiero',
    url: 'https://www.cmfchile.cl/educa/621/w3-propertyvalue-1516.html',
    tags: ['cmf', 'glosario', 'definiciones'],
  },
  {
    title: 'CMF - Ley Fintec',
    url: 'https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-47748.html',
    tags: ['cmf', 'ley fintec', 'regulacion'],
  },
  {
    title: 'Biblioteca del Congreso - Ley 21.521 (Fintec)',
    url: 'https://www.bcn.cl/leychile/navegar?idNorma=1182402',
    tags: ['ley', 'fintec', 'chile'],
  },
];

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 12);
}

function bestSnippet(text: string, tokens: string[]): { snippet: string; score: number } {
  const low = text.toLowerCase();
  let bestIdx = -1;
  let bestTokenLen = 0;
  let score = 0;

  for (const token of tokens) {
    const idx = low.indexOf(token);
    if (idx >= 0) {
      score += 1;
      if (bestIdx === -1 || token.length > bestTokenLen) {
        bestIdx = idx;
        bestTokenLen = token.length;
      }
    }
  }

  if (bestIdx === -1) {
    return { snippet: text.slice(0, 240), score: 0 };
  }

  const start = Math.max(0, bestIdx - 160);
  const end = Math.min(text.length, bestIdx + 260);
  return { snippet: text.slice(start, end), score };
}

export const chileRegulatoryLookupTool: MCPTool = {
  name: 'regulatory.lookup_cl',
  description:
    'Consulta fuentes regulatorias de Chile (CMF y Ley Fintec) y retorna snippets con citas para RAG normativo.',
  argsSchema: z.object({
    query: z.string().min(3),
    limit: z.number().int().min(1).max(8).optional().default(4),
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
    const limit = Number(args.limit ?? 4);
    const tokens = tokenize(query);

    const hits: Array<{
      title: string;
      url: string;
      snippet: string;
      score: number;
      tags: string[];
    }> = [];

    for (const source of REGULATORY_SOURCES) {
      try {
        const res = await fetch(source.url, {
          headers: { 'User-Agent': 'FinancialAgent/1.0 (regulatory lookup)' },
        });
        if (!res.ok) continue;
        const html = await res.text();
        const text = stripHtml(html);
        if (!text) continue;

        const { snippet, score } = bestSnippet(text, tokens);
        const baseScore = source.tags.some((t) => query.toLowerCase().includes(t)) ? 1 : 0;
        hits.push({
          title: source.title,
          url: source.url,
          snippet,
          score: score + baseScore,
          tags: source.tags,
        });
      } catch {
        // Skip unreachable sources; keep best-effort behavior.
      }
    }

    hits.sort((a, b) => b.score - a.score);
    const top = hits.slice(0, limit);

    const citations = top.map((h) => ({
      doc_id: h.url,
      doc_title: h.title,
      supporting_span: h.snippet,
      supports: 'definition' as const,
      confidence: Math.min(0.9, 0.55 + h.score * 0.08),
      url: h.url,
    }));

    return {
      tool_call: {
        tool: 'regulatory.lookup_cl',
        args,
        status: 'success',
        result: { found: citations.length },
      },
      data: {
        query,
        found: citations.length,
        results: top,
      },
      citations,
    };
  },
};

