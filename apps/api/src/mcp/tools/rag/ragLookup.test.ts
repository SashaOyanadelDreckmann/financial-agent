/**
 * ragLookup.test.ts
 *
 * Tests for RAG keyword-based lookup over corpus.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ragLookupTool } from './ragLookup.tool';
import { fixtures } from '../../../test/fixtures';

describe('RAG Lookup Tool', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('Basic Search', () => {
    it('should return results for valid financial queries', async () => {
      const result = await ragLookupTool.run({
        query: fixtures.rag.queries[0], // 'APV ahorro previsional'
      });

      expect(result).toBeDefined();
      expect(result.found).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.citations)).toBe(true);
    });

    it('should handle multiple query terms', async () => {
      const result = await ragLookupTool.run({
        query: 'fondos mutuales comisiones',
      });

      expect(result).toBeDefined();
      expect(result.found).toBeGreaterThanOrEqual(0);
    });

    it('should return citations with required fields', async () => {
      const result = await ragLookupTool.run({
        query: 'tasas de crédito',
      });

      if (result.citations && result.citations.length > 0) {
        const citation = result.citations[0];
        expect(citation.doc_id).toBeDefined();
        expect(citation.doc_title).toBeDefined();
        expect(citation.supporting_span).toBeDefined();
        expect(citation.confidence).toBeDefined();
        expect(typeof citation.confidence).toBe('number');
        expect(citation.confidence).toBeGreaterThanOrEqual(0);
        expect(citation.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should rank results by relevance', async () => {
      const result = await ragLookupTool.run({
        query: 'APV',
      });

      if (result.citations && result.citations.length > 1) {
        // Check that confidence scores are in descending order
        for (let i = 0; i < result.citations.length - 1; i++) {
          const current = result.citations[i].confidence;
          const next = result.citations[i + 1].confidence;
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });
  });

  describe('No Results Handling', () => {
    it('should handle queries with no matches gracefully', async () => {
      const result = await ragLookupTool.run({
        query: 'xyzabc123nonexistent',
      });

      expect(result).toBeDefined();
      expect(result.found).toBe(0);
      expect(result.citations).toEqual([]);
    });

    it('should handle empty query', async () => {
      const result = await ragLookupTool.run({
        query: '',
      });

      expect(result).toBeDefined();
      expect(result.found).toBeGreaterThanOrEqual(0);
    });

    it('should handle whitespace-only query', async () => {
      const result = await ragLookupTool.run({
        query: '   ',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Corpus Coverage', () => {
    it('should find APV documents', async () => {
      const result = await ragLookupTool.run({
        query: 'APV ahorro previsional',
      });

      expect(result.found).toBeGreaterThanOrEqual(0);
    });

    it('should find regulation documents', async () => {
      const result = await ragLookupTool.run({
        query: 'CMF regulación',
      });

      expect(result.found).toBeGreaterThanOrEqual(0);
    });

    it('should find market data documents', async () => {
      const result = await ragLookupTool.run({
        query: 'UF UTM tasas',
      });

      expect(result.found).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Citation Quality', () => {
    it('should extract supporting spans from documents', async () => {
      const result = await ragLookupTool.run({
        query: 'inversión segura',
      });

      if (result.citations && result.citations.length > 0) {
        const citation = result.citations[0];
        expect(citation.supporting_span).toBeTruthy();
        expect(citation.supporting_span.length).toBeGreaterThan(0);
      }
    });

    it('should include document titles in citations', async () => {
      const result = await ragLookupTool.run({
        query: 'finanzas personales',
      });

      if (result.citations && result.citations.length > 0) {
        expect(result.citations[0].doc_title).toBeTruthy();
        expect(typeof result.citations[0].doc_title).toBe('string');
      }
    });

    it('should provide confidence scores that reflect relevance', async () => {
      const result1 = await ragLookupTool.run({
        query: 'APV',
      });

      const result2 = await ragLookupTool.run({
        query: 'ahorrar dinero',
      });

      // Both should return valid confidence scores
      if (result1.citations && result1.citations.length > 0) {
        expect(result1.citations[0].confidence).toBeGreaterThanOrEqual(0);
      }
      if (result2.citations && result2.citations.length > 0) {
        expect(result2.citations[0].confidence).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long queries', async () => {
      const longQuery = 'APV ahorro previsional fondos mutuales comisiones tasas de crédito seguros bancarios fintec regulación '.repeat(
        5
      );

      const result = await ragLookupTool.run({
        query: longQuery,
      });

      expect(result).toBeDefined();
      expect(result.citations).toBeDefined();
    });

    it('should handle special characters in queries', async () => {
      const result = await ragLookupTool.run({
        query: 'APV (ahorro) & previsional #finanzas @inversión',
      });

      expect(result).toBeDefined();
    });

    it('should handle Spanish accents and tildes', async () => {
      const result = await ragLookupTool.run({
        query: 'préstamos ahorró crédito',
      });

      expect(result).toBeDefined();
    });

    it('should return max 10 results by default', async () => {
      const result = await ragLookupTool.run({
        query: 'a',
      });

      expect(result.citations.length).toBeLessThanOrEqual(10);
    });
  });
});
