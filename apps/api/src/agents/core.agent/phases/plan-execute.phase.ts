/**
 * plan-execute.phase.ts
 *
 * PHASE 2-3: Planning + Execution (ReAct Loop)
 * Decides which tools to call and executes them in a loop
 */

import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, buildAnthropicTools, getOriginalToolName } from '../../../mcp/anthropic-bridge';
import { runMCPTool } from '../../../mcp/tools/runMCPTool';
import { runReportAgent } from '../report.agent/report.agent';
import { CORE_TOOL_AGENT_SYSTEM } from '../system.prompts';
import { extractChartBlocksFromToolOutput } from '../helpers/chart-extraction.helpers';
import type { ExecutionResult, PlanPhaseInput, PlanPhaseOutput } from '../agent-types';
import type { ToolCall, Citation, Artifact, AgentBlock } from '../chat.types';
import { getLogger } from '../../../logger';

const MAX_REACT_ITERATIONS = 8;
const REACT_TIMEOUT_MS = 30000;

/**
 * Run ReAct loop: classify → identify tools → execute in loop until complete
 */
export async function runPlanExecutePhase(input: PlanPhaseInput): Promise<PlanPhaseOutput> {
  const logger = getLogger();
  const startTime = Date.now();

  try {
    const client = getAnthropicClient();

    // Build tool definitions for Anthropic
    const anthropicTools = buildAnthropicTools();

    // Initialize accumulators
    const tool_calls: ToolCall[] = [];
    const tool_outputs: Array<{ tool: string; data: any }> = [];
    const citations: Citation[] = [];
    const artifacts: Artifact[] = [];
    const agent_blocks: AgentBlock[] = [];
    const react_trace: Array<{ iteration: number; decision: string; result: string }> = [];

    // Build loop messages
    const loopMessages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: buildExecutionPrompt(input),
      },
    ];

    // ReAct Loop
    let iterations = 0;
    let is_complete = false;

    while (iterations < MAX_REACT_ITERATIONS && !is_complete && Date.now() - startTime < REACT_TIMEOUT_MS) {
      iterations++;

      // Call Claude with tool_use
      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: CORE_TOOL_AGENT_SYSTEM,
        tools: anthropicTools,
        messages: loopMessages,
      });

      // Check stop reason
      if (response.stop_reason === 'end_turn') {
        is_complete = true;

        // Extract final text message
        const textBlocks = response.content.filter(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        );
        if (textBlocks.length > 0) {
          loopMessages.push({
            role: 'assistant',
            content: textBlocks[0].text,
          });
        }
        break;
      }

      // Process tool use blocks
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        // No tools, we're done
        is_complete = true;
        break;
      }

      // Add assistant message with all content
      loopMessages.push({
        role: 'assistant',
        content: response.content,
      });

      // Execute each tool
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const originalName = getOriginalToolName(toolUse.name);

        react_trace.push({
          iteration: iterations,
          decision: `Use tool: ${originalName}`,
          result: 'pending',
        });

        try {
          let result: any;

          // Special handling for report generation
          if (originalName === 'pdf.generate_report') {
            result = await runReportAgent(toolUse.input as any);
            if (result.artifact_id) {
              artifacts.push({
                id: result.artifact_id,
                type: 'pdf',
                title: result.title || 'Report',
              });
            }
          } else {
            // Regular MCP tool
            const toolResult = await runMCPTool(originalName, toolUse.input);

            if (toolResult.status === 'success') {
              // Extract charts if present
              const charts = extractChartBlocksFromToolOutput(
                JSON.stringify(toolResult.data)
              );
              agent_blocks.push(...charts);

              // Extract citations if present
              if (Array.isArray(toolResult.data?.citations)) {
                citations.push(...toolResult.data.citations);
              }

              result = toolResult.data;
            } else {
              result = { error: toolResult.data?.error || 'Tool execution failed' };
            }
          }

          tool_calls.push({
            id: toolUse.id,
            tool: originalName,
            input: toolUse.input,
            status: 'completed',
          });

          tool_outputs.push({
            tool: originalName,
            data: result,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });

          react_trace[react_trace.length - 1].result = 'success';
        } catch (err) {
          logger.warn({
            msg: '[Execute] Tool failed',
            tool: originalName,
            error: err,
          });

          tool_calls.push({
            id: toolUse.id,
            tool: originalName,
            input: toolUse.input,
            status: 'failed',
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: String(err) }),
            is_error: true,
          });

          react_trace[react_trace.length - 1].result = 'failed';
        }
      }

      // Add tool results to loop
      loopMessages.push({
        role: 'user',
        content: toolResults,
      });
    }

    const execution_result: ExecutionResult = {
      tool_calls,
      tool_outputs,
      artifacts,
      agent_blocks,
      citations,
      react_trace,
      iterations_count: iterations,
    };

    logger.info({
      msg: '[Execute] ReAct loop complete',
      iterations,
      tool_calls_count: tool_calls.length,
      latency_ms: Date.now() - startTime,
    });

    return {
      execution_result,
      plan_objective: input.classification.intent,
    };
  } catch (err) {
    logger.error({
      msg: '[Execute] Phase failed',
      error: err,
      latency_ms: Date.now() - startTime,
    });
    throw err;
  }
}

/**
 * Build execution prompt for ReAct loop
 */
function buildExecutionPrompt(input: PlanPhaseInput): string {
  return `
User intent: ${input.classification.intent}
Mode: ${input.classification.mode}

User context:
${JSON.stringify(input.context_summary, null, 2)}

Please use available tools to fulfill the user's request.
`;
}
