import path from 'path';
import { promises as fs } from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('knowledge.service', () => {
  const tmpRoot = path.join(process.cwd(), 'tmp', 'knowledge-service-test');
  const userId = 'user_knowledge_test';
  const userDir = path.join(tmpRoot, 'users');
  const userPath = path.join(userDir, `${userId}.json`);

  beforeEach(async () => {
    vi.resetModules();
    process.env.DATA_DIR = tmpRoot;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    await fs.mkdir(userDir, { recursive: true });
    await fs.writeFile(
      userPath,
      JSON.stringify(
        {
          id: userId,
          name: 'Knowledge User',
          email: 'knowledge@example.com',
          passwordHash: 'hash',
          knowledgeBaseScore: 20,
          knowledgeScore: 20,
          knowledgeHistory: [],
          knowledgeLastUpdated: new Date().toISOString(),
        },
        null,
        2
      )
    );
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
    delete process.env.DATA_DIR;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
  });

  it('persists a single event without double-counting the score', async () => {
    const knowledgeService = await import('./knowledge.service');

    const first = await knowledgeService.recordKnowledgeEvent(
      userId,
      'learned_concept',
      'User understood a core concept'
    );
    const second = await knowledgeService.recordKnowledgeEvent(
      userId,
      'asked_good_question',
      'User asked a clarifying question'
    );

    expect(first.newScore).toBe(25);
    expect(second.newScore).toBe(30);

    const tracker = await knowledgeService.getKnowledgeTracker(userId);
    expect(tracker.baseScore).toBe(20);
    expect(tracker.totalGains).toBe(10);
    expect(tracker.history).toHaveLength(2);
  });

  it('migrates legacy stored knowledgeScore into a stable base score', async () => {
    await fs.writeFile(
      userPath,
      JSON.stringify(
        {
          id: userId,
          name: 'Legacy User',
          email: 'legacy@example.com',
          passwordHash: 'hash',
          knowledgeScore: 35,
          knowledgeHistory: [
            {
              timestamp: new Date().toISOString(),
              action: 'learned_concept',
              points: 5,
              rationale: 'Legacy event',
            },
          ],
          knowledgeLastUpdated: new Date().toISOString(),
        },
        null,
        2
      )
    );

    const knowledgeService = await import('./knowledge.service');
    const tracker = await knowledgeService.getKnowledgeTracker(userId);

    expect(tracker.baseScore).toBe(30);
    expect(tracker.totalGains).toBe(5);

    const effective = await knowledgeService.calculateEffectiveScore(userId);
    expect(effective.score).toBe(35);
  });
});
