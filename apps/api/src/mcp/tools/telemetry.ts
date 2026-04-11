/**
 * telemetry.ts
 *
 * Telemetry and metrics for MCP tool execution
 * Tracks latency, token usage, error rates, and cache hits
 */

import { getLogger } from '../../logger';
import type { ToolContext, ToolErrorCode } from './types';

export interface ToolMetrics {
  tool: string;
  latency_ms: number;
  status: 'success' | 'error' | 'timeout';
  error_code?: string;
  user_id?: string;
  session_id?: string;
  timestamp: number;
}

/**
 * Tool execution metrics collector
 */
export class ToolMetricsCollector {
  private startTime: number = 0;
  private startMemory: number = 0;

  constructor(private toolName: string) {
    this.startTime = Date.now();
    if (typeof process !== 'undefined' && process.memoryUsage) {
      this.startMemory = process.memoryUsage().heapUsed;
    }
  }

  /**
   * Record successful tool execution
   */
  recordSuccess(context?: ToolContext): ToolMetrics {
    const latency = Date.now() - this.startTime;
    const metrics: ToolMetrics = {
      tool: this.toolName,
      latency_ms: latency,
      status: 'success',
      user_id: context?.user_id,
      session_id: context?.session_id,
      timestamp: Date.now(),
    };

    this.log(metrics);
    return metrics;
  }

  /**
   * Record tool execution error
   */
  recordError(
    errorCode: string,
    context?: ToolContext,
    isTimeout: boolean = false,
  ): ToolMetrics {
    const latency = Date.now() - this.startTime;
    const metrics: ToolMetrics = {
      tool: this.toolName,
      latency_ms: latency,
      status: isTimeout ? 'timeout' : 'error',
      error_code: errorCode,
      user_id: context?.user_id,
      session_id: context?.session_id,
      timestamp: Date.now(),
    };

    this.log(metrics);
    return metrics;
  }

  /**
   * Get memory usage delta
   */
  getMemoryDelta(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const currentMemory = process.memoryUsage().heapUsed;
      return currentMemory - this.startMemory;
    }
    return 0;
  }

  /**
   * Log metrics in structured format
   */
  private log(metrics: ToolMetrics): void {
    const logger = getLogger();
    const memoryDelta = this.getMemoryDelta();

    const logData = {
      msg: '[Tool] Execution',
      tool: metrics.tool,
      status: metrics.status,
      latency_ms: metrics.latency_ms,
      memory_delta_bytes: memoryDelta,
      error_code: metrics.error_code,
      user_id: metrics.user_id,
      session_id: metrics.session_id,
    };

    if (metrics.status === 'error' || metrics.status === 'timeout') {
      logger.warn(logData);
    } else {
      logger.debug(logData);
    }
  }
}

/**
 * Global metrics aggregator
 */
export class ToolMetricsAggregator {
  private toolMetrics: Map<string, ToolMetrics[]> = new Map();

  /**
   * Record tool execution metrics
   */
  record(metrics: ToolMetrics): void {
    if (!this.toolMetrics.has(metrics.tool)) {
      this.toolMetrics.set(metrics.tool, []);
    }

    const list = this.toolMetrics.get(metrics.tool)!;
    list.push(metrics);

    // Keep only last 1000 metrics per tool to avoid memory leak
    if (list.length > 1000) {
      list.shift();
    }
  }

  /**
   * Get summary stats for a tool
   */
  getStats(toolName: string): {
    total_calls: number;
    success_count: number;
    error_count: number;
    timeout_count: number;
    avg_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
  } {
    const metrics = this.toolMetrics.get(toolName) || [];

    if (metrics.length === 0) {
      return {
        total_calls: 0,
        success_count: 0,
        error_count: 0,
        timeout_count: 0,
        avg_latency_ms: 0,
        p95_latency_ms: 0,
        p99_latency_ms: 0,
      };
    }

    const latencies = metrics.map((m) => m.latency_ms).sort((a, b) => a - b);
    const successCount = metrics.filter((m) => m.status === 'success').length;
    const errorCount = metrics.filter((m) => m.status === 'error').length;
    const timeoutCount = metrics.filter((m) => m.status === 'timeout').length;

    return {
      total_calls: metrics.length,
      success_count: successCount,
      error_count: errorCount,
      timeout_count: timeoutCount,
      avg_latency_ms: Math.round(latencies.reduce((a, b) => a + b) / metrics.length),
      p95_latency_ms: latencies[Math.floor(latencies.length * 0.95)],
      p99_latency_ms: latencies[Math.floor(latencies.length * 0.99)],
    };
  }

  /**
   * Get summary for all tools
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [toolName] of this.toolMetrics) {
      stats[toolName] = this.getStats(toolName);
    }

    return stats;
  }

  /**
   * Clear metrics (admin operation)
   */
  clear(): void {
    this.toolMetrics.clear();
  }
}

/**
 * Global metrics aggregator instance
 */
let globalAggregator: ToolMetricsAggregator | null = null;

/**
 * Get or create global aggregator
 */
export function getGlobalAggregator(): ToolMetricsAggregator {
  if (!globalAggregator) {
    globalAggregator = new ToolMetricsAggregator();
  }
  return globalAggregator;
}

/**
 * Create new metrics collector for a tool
 */
export function createMetricsCollector(toolName: string): ToolMetricsCollector {
  return new ToolMetricsCollector(toolName);
}

/**
 * Record tool metrics globally
 */
export function recordToolMetrics(metrics: ToolMetrics): void {
  getGlobalAggregator().record(metrics);
}

/**
 * Get aggregated stats for tool
 */
export function getToolStats(toolName: string) {
  return getGlobalAggregator().getStats(toolName);
}

/**
 * Get all tool stats
 */
export function getAllToolStats() {
  return getGlobalAggregator().getAllStats();
}
