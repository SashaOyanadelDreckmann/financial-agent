/**
 * chart-extraction.helpers.ts
 * Extract charts and visual blocks from tool outputs
 */

import type { AgentBlock, ChartBlock, TableBlock } from '../chat.types';

/**
 * Extract chart blocks from tool output text
 * Looks for patterns like <CHART>...data...</CHART>, <TABLE>...data...</TABLE>
 */
export function extractChartBlocksFromToolOutput(
  text: string,
  context?: any
): AgentBlock[] {
  const blocks: AgentBlock[] = [];

  // Match <CHART> blocks
  const chartRegex = /<CHART>(\{[\s\S]*?\})<\/CHART>/g;
  let match;
  while ((match = chartRegex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const block: ChartBlock = {
        kind: 'chart',
        title: data.title || 'Chart',
        subtitle: data.subtitle,
        type: data.type || 'line',
        labels: data.labels || [],
        values: data.values || [],
      };
      blocks.push(block);
    } catch {
      // Invalid JSON in tag, skip
    }
  }

  // Match <TABLE> blocks
  const tableRegex = /<TABLE>(\{[\s\S]*?\})<\/TABLE>/g;
  while ((match = tableRegex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const block: TableBlock = {
        kind: 'table',
        title: data.title || 'Table',
        columns: data.columns || [],
        rows: data.rows || [],
        align: data.align,
      };
      blocks.push(block);
    } catch {
      // Invalid JSON in tag, skip
    }
  }

  return blocks;
}

/**
 * Extract suggested replies from <SUGERENCIAS> tag
 */
export function extractSuggestedReplies(text: string): string[] {
  const match = text.match(/<SUGERENCIAS>\[([\s\S]*?)\]<\/SUGERENCIAS>/);
  if (!match) return [];

  try {
    const jsonStr = `[${match[1]}]`;
    return JSON.parse(jsonStr);
  } catch {
    // Try simpler parsing: split by comma + clean quotes
    const items = match[1]
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    return items;
  }
}

/**
 * Parse panel action from text
 */
export function extractPanelAction(
  text: string
): { section?: string; message?: string } | undefined {
  const match = text.match(/<PANEL>(\{[\s\S]*?\})<\/PANEL>/);
  if (!match) return undefined;

  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

/**
 * Remove all special tags from text
 */
export function cleanSpecialTags(text: string): string {
  return text
    .replace(/<CHART>[\s\S]*?<\/CHART>/g, '')
    .replace(/<TABLE>[\s\S]*?<\/TABLE>/g, '')
    .replace(/<SUGERENCIAS>[\s\S]*?<\/SUGERENCIAS>/g, '')
    .replace(/<PANEL>[\s\S]*?<\/PANEL>/g, '')
    .replace(/<CONTEXT_SCORE>\d+<\/CONTEXT_SCORE>/g, '')
    .trim();
}
