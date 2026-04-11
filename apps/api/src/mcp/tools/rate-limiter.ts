/**
 * rate-limiter.ts
 *
 * Rate limiting framework for MCP tools
 * Prevents abuse and protects external APIs
 */

import { ToolErrorCode, rateLimitError } from './error';
import type { ToolContext } from './types';

/**
 * Configuration for per-tool rate limiting
 */
export interface RateLimitConfig {
  tool: string;
  requests_per_minute: number;
  burst_size?: number; // Allow burst up to this many requests
}

/**
 * Default rate limits per tool
 */
export const DEFAULT_RATE_LIMITS: RateLimitConfig[] = [
  { tool: 'web.search', requests_per_minute: 10, burst_size: 2 },
  { tool: 'web.extract', requests_per_minute: 20, burst_size: 3 },
  { tool: 'web.scrape', requests_per_minute: 5, burst_size: 1 },
  { tool: 'regulatory.lookup_cl', requests_per_minute: 10, burst_size: 1 },
  { tool: 'market.expected_annual_return', requests_per_minute: 100 },
  { tool: 'market.funds_search', requests_per_minute: 100 },
  { tool: 'market.stock_analysis', requests_per_minute: 100 },
  { tool: 'simpro.montecarlo', requests_per_minute: 50, burst_size: 2 },
  { tool: 'rag.lookup', requests_per_minute: 500 }, // Local, no limit needed
  // Default for unlisted tools
];

/**
 * Rate limit tracking entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

/**
 * In-memory rate limiter
 * Tracks requests per user per tool
 * Auto-cleans old entries to prevent memory leak
 */
export class ToolRateLimiter {
  private limits: Map<string, RateLimitConfig> = new Map();
  private tracking: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(configs?: RateLimitConfig[]) {
    // Initialize with defaults
    for (const config of DEFAULT_RATE_LIMITS) {
      this.limits.set(config.tool, config);
    }

    // Override with custom configs
    if (configs) {
      for (const config of configs) {
        this.limits.set(config.tool, config);
      }
    }

    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if tool call is allowed
   * Throws if rate limit exceeded
   */
  async checkLimit(toolName: string, userId?: string): Promise<void> {
    const key = this.buildKey(toolName, userId);
    const config = this.limits.get(toolName);

    if (!config) {
      return; // No limit configured
    }

    const now = Date.now();
    let entry = this.tracking.get(key);

    // If blocked, check if block period has expired
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      throw rateLimitError(toolName, retryAfter);
    }

    // Check if entry has expired (1 minute window)
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + 60 * 1000,
      };
    }

    // Check count against limit
    const burstSize = config.burst_size ?? 1;
    const maxRequests = config.requests_per_minute;

    if (entry.count >= maxRequests) {
      // Block for 30 seconds
      entry.blockedUntil = now + 30 * 1000;
      this.tracking.set(key, entry);
      throw rateLimitError(toolName, 30);
    }

    // Increment counter
    entry.count += 1;
    this.tracking.set(key, entry);
  }

  /**
   * Record successful tool execution
   * Optional: can adjust limits based on response characteristics
   */
  recordSuccess(toolName: string, userId?: string, durationMs?: number): void {
    // Could be extended to track slow requests and adjust limits
    // For now, just a placeholder for metrics
  }

  /**
   * Record tool execution failure
   * Optional: adjust rate limits based on failure type
   */
  recordFailure(toolName: string, userId?: string, errorCode?: string): void {
    // Could implement exponential backoff or temporary limits
    // based on repeated failures
  }

  /**
   * Reset limits for a user (admin operation)
   */
  resetUserLimits(userId: string): void {
    const prefix = `${userId}:`;
    for (const key of this.tracking.keys()) {
      if (key.startsWith(prefix)) {
        this.tracking.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status for a tool
   */
  getStatus(toolName: string, userId?: string): {
    current: number;
    limit: number;
    resetIn: number;
    blocked: boolean;
  } {
    const key = this.buildKey(toolName, userId);
    const config = this.limits.get(toolName);
    const entry = this.tracking.get(key);

    if (!config) {
      return { current: 0, limit: 0, resetIn: 0, blocked: false };
    }

    const now = Date.now();
    const blocked = !!(entry?.blockedUntil && now < entry.blockedUntil);

    return {
      current: entry?.count ?? 0,
      limit: config.requests_per_minute,
      resetIn: Math.max(0, (entry?.resetAt ?? now) - now),
      blocked,
    };
  }

  /**
   * Cleanup old entries to prevent memory leak
   * Entries older than 10 minutes are removed
   */
  private cleanup(): void {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000;

    for (const [key, entry] of this.tracking.entries()) {
      if (entry.resetAt < tenMinutesAgo) {
        this.tracking.delete(key);
      }
    }
  }

  /**
   * Build cache key from tool and user
   */
  private buildKey(toolName: string, userId?: string): string {
    return userId ? `${userId}:${toolName}` : `anonymous:${toolName}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * Global rate limiter instance
 */
let globalLimiter: ToolRateLimiter | null = null;

/**
 * Get or create global rate limiter
 */
export function getGlobalRateLimiter(): ToolRateLimiter {
  if (!globalLimiter) {
    globalLimiter = new ToolRateLimiter();
  }
  return globalLimiter;
}

/**
 * Check rate limit before executing tool
 */
export async function checkRateLimit(
  toolName: string,
  context?: ToolContext,
): Promise<void> {
  const limiter = getGlobalRateLimiter();
  await limiter.checkLimit(toolName, context?.user_id);
}
