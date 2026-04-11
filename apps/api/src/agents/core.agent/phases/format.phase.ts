/**
 * format.phase.ts
 *
 * PHASE 5: Format Response
 * Generate final response, parse special tags, detect knowledge events
 */

import { complete } from '../../../services/llm.service';
import { CORE_RESPONSE_SYSTEM } from '../system.prompts';
import { detectKnowledgeEvent } from '../knowledge-detector';
import { recordKnowledgeEvent, getMilestones, KNOWLEDGE_MILESTONES } from '../../../services/knowledge.service';
import {
  extractSuggestedReplies,
  extractPanelAction,
  cleanSpecialTags,
} from '../helpers/chart-extraction.helpers';
import { stripEmojis } from '../helpers/format.helpers';
import type { FormatPhaseInput, FormatPhaseOutput, FormattedResponse } from '../agent-types';
import { getLogger } from '../../../logger';

/**
 * Format response from raw LLM output
 */
export async function runFormatPhase(input: FormatPhaseInput): Promise<FormatPhaseOutput> {
  const logger = getLogger();
  const startTime = Date.now();

  try {
    // Call LLM to format response
    const rawResponse = await complete(input.user_message, {
      systemPrompt: CORE_RESPONSE_SYSTEM,
      temperature: 0.4,
    });

    // Parse special tags
    const suggested_replies = extractSuggestedReplies(rawResponse);
    const panel_action = extractPanelAction(rawResponse);

    // Clean message
    let message = cleanSpecialTags(rawResponse);
    message = stripEmojis(message).trim();

    // Extract context score
    const contextScoreMatch = rawResponse.match(/<CONTEXT_SCORE>(\d+)<\/CONTEXT_SCORE>/);
    const context_score = contextScoreMatch ? parseInt(contextScoreMatch[1], 10) : undefined;

    // Build formatted response
    const formatted_response: FormattedResponse = {
      message,
      agent_blocks: input.execution_result?.agent_blocks || [],
      artifacts: input.execution_result?.artifacts || [],
      citations: input.execution_result?.citations || [],
      suggested_replies,
      panel_action,
      context_score,
      budget_updates: [],
    };

    logger.info({
      msg: '[Format] Phase complete',
      has_suggestions: suggested_replies.length > 0,
      has_artifacts: formatted_response.artifacts.length > 0,
      latency_ms: Date.now() - startTime,
    });

    return { formatted_response };
  } catch (err) {
    logger.error({
      msg: '[Format] Phase failed',
      error: err,
      latency_ms: Date.now() - startTime,
    });
    throw err;
  }
}

/**
 * Detect knowledge events and record milestone unlocks
 */
export async function detectAndRecordKnowledge(params: {
  user_id?: string;
  user_message: string;
  agent_response: string;
  tools_used: string[];
  mode: string;
  previous_score: number;
  user_profile?: any;
}): Promise<{
  knowledge_event_detected: boolean;
  knowledge_score: number;
  milestone_unlocked?: { threshold: number; feature: string };
}> {
  const logger = getLogger();

  try {
    const detection = detectKnowledgeEvent(params);

    if (detection.detected && params.user_id) {
      const { newScore, points } = await recordKnowledgeEvent(
        params.user_id,
        detection.action!,
        detection.rationale,
        {
          confidence: detection.confidence,
          tools_used: params.tools_used,
          mode: params.mode,
        }
      );

      // Check for milestone unlocks
      const milestones = getMilestones(newScore);
      const previousMilestones = getMilestones(params.previous_score);

      const newUnlocks = milestones.unlocked.filter(
        (m) => !previousMilestones.unlocked.includes(m)
      );

      if (newUnlocks.length > 0) {
        const unlockedFeature = newUnlocks[0];
        const unlockedMilestone = KNOWLEDGE_MILESTONES.find(
          (m) => m.feature === unlockedFeature
        );

        logger.info({
          msg: '[Knowledge] Milestone unlocked',
          user_id: params.user_id,
          milestone: unlockedMilestone,
          newScore,
        });

        return {
          knowledge_event_detected: true,
          knowledge_score: newScore,
          milestone_unlocked: {
            threshold: unlockedMilestone?.threshold || 0,
            feature: unlockedFeature,
          },
        };
      }

      logger.info({
        msg: '[Knowledge] Event recorded',
        user_id: params.user_id,
        action: detection.action,
        points,
        newScore,
      });

      return {
        knowledge_event_detected: true,
        knowledge_score: newScore,
      };
    }

    return {
      knowledge_event_detected: false,
      knowledge_score: params.previous_score,
    };
  } catch (err) {
    logger.warn({
      msg: '[Knowledge] Detection failed (non-blocking)',
      error: err,
    });

    return {
      knowledge_event_detected: false,
      knowledge_score: params.previous_score,
    };
  }
}
