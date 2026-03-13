import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import type { MCPTool } from '../types';

function collectFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(root)) {
    const p = path.join(root, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...collectFiles(p));
    else if (/\.(md|json|txt)$/i.test(entry)) out.push(p);
  }
  return out;
}

function readSafe(p: string): string {
  try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; }
}

export const ragLookupTool: MCPTool = {
  name: 'rag.lookup',
  description:
    'Local RAG over apps/api/src/mcp/{knowledge,guides,contracts,examples}. Returns citations with snippets.',
  argsSchema: z.object({
    query: z.string().min(1),
    limit: z.number().optional(),
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
    const query = String(args.query).toLowerCase();
    const limit = Math.max(1, Math.min(8, Math.floor(Number(args.limit ?? 5))));

    const base = path.join(process.cwd(), 'apps', 'api', 'src', 'mcp');
    const files = [
      ...collectFiles(path.join(base, 'knowledge')),
      ...collectFiles(path.join(base, 'guides')),
      ...collectFiles(path.join(base, 'contracts')),
      ...collectFiles(path.join(base, 'examples')),
    ];

    const hits: Array<{ file: string; idx: number; snippet: string }> = [];

    for (const f of files) {
      const txt = readSafe(f);
      if (!txt) continue;

      const low = txt.toLowerCase();
      const idx = low.indexOf(query);
      if (idx === -1) continue;

      const start = Math.max(0, idx - 160);
      const end = Math.min(txt.length, idx + 240);
      const snippet = txt.slice(start, end).replace(/\s+/g, ' ').trim();

      hits.push({ file: f, idx, snippet });
    }

    hits.sort((a, b) => a.idx - b.idx);
    const top = hits.slice(0, limit);

    const citations = top.map((h, i) => ({
      doc_id: h.file,
      doc_title: path.basename(h.file),
      chunk_id: `local_${i}`,
      supporting_span: h.snippet,
      supports: 'claim' as const,
      confidence: 0.75,
      url: undefined,
    }));

    return {
      tool_call: { tool: 'rag.lookup', args, status: 'success', result: { found: citations.length } },
      data: { found: citations.length, citations },
      citations,
    };
  },
};
