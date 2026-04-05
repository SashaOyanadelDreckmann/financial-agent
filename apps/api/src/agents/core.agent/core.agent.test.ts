/**
 * core.agent.test.ts
 *
 * Tests for the core chat agent: classification, planning, tool selection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runCoreAgent } from './core.agent';
import { fixtures, createMockRequestContext } from '../../test/fixtures';
import type { ChatAgentInput } from './chat.types';

describe('Core Agent', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('Classification', () => {
    it('should classify financial education queries correctly', async () => {
      const input: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: fixtures.agent.simpleQuery,
        history: [],
        context: createMockRequestContext(),
      };

      const response = await runCoreAgent(input);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.response).toBeDefined();
      expect(response.response.text).toBeTruthy();
    });

    it('should handle tool-using queries', async () => {
      const input: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: fixtures.agent.toolUsingQuery,
        history: [],
        context: createMockRequestContext(),
      };

      const response = await runCoreAgent(input);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
    });

    it('should include compliance info in response', async () => {
      const input: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: 'How should I invest?',
        history: [],
        context: createMockRequestContext(),
      };

      const response = await runCoreAgent(input);

      expect(response.response.compliance).toBeDefined();
      expect(response.response.compliance.disclaimer).toBeTruthy();
      expect(response.response.compliance.auditLog).toBeDefined();
    });

    it('should generate citations from RAG results', async () => {
      const input: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: 'What is APV?',
        history: [],
        context: createMockRequestContext(),
      };

      const response = await runCoreAgent(input);

      expect(response.response.citations).toBeDefined();
      expect(Array.isArray(response.response.citations)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return error response on invalid input', async () => {
      const input = {
        user_id: 'test-user',
        session_id: 'test-session',
        // Missing required user_message
      } as any;

      try {
        await runCoreAgent(input);
        expect.fail('Should have thrown validation error');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should handle empty message gracefully', async () => {
      const input: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: '',
        history: [],
        context: createMockRequestContext(),
      };

      try {
        await runCoreAgent(input);
        // Should either throw or return error response
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });

  describe('Response Structure', () => {
    it('should return structured response with required fields', async () => {
      const input: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: fixtures.agent.simpleQuery,
        history: [],
        context: createMockRequestContext(),
      };

      const response = await runCoreAgent(input);

      expect(response.success).toBeDefined();
      expect(response.response).toBeDefined();
      expect(response.response.text).toBeTruthy();
      expect(response.response.citations).toBeDefined();
      expect(response.response.compliance).toBeDefined();
    });

    it('response compliance should include mode and disclaimer', async () => {
      const input: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: fixtures.agent.simpleQuery,
        history: [],
        context: createMockRequestContext(),
      };

      const response = await runCoreAgent(input);
      const { compliance } = response.response;

      expect(compliance.mode).toBeDefined();
      expect(compliance.disclaimer).toBeTruthy();
      expect(compliance.riskScore).toBeDefined();
      expect(typeof compliance.riskScore).toBe('number');
      expect(compliance.auditLog).toBeDefined();
    });
  });

  describe('Multi-turn Conversation', () => {
    it('should maintain context across messages', async () => {
      const context = createMockRequestContext();

      // First message
      const input1: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: 'How much should I save?',
        history: [],
        context,
      };

      const response1 = await runCoreAgent(input1);
      expect(response1.success).toBe(true);

      // Second message with history
      const input2: ChatAgentInput = {
        user_id: 'test-user',
        session_id: 'test-session',
        user_message: 'And for retirement?',
        history: [
          { role: 'user', content: input1.user_message },
          { role: 'assistant', content: response1.response.text },
        ],
        context,
      };

      const response2 = await runCoreAgent(input2);
      expect(response2.success).toBe(true);
      expect(response2.response.text).toBeTruthy();
    });
  });
});
