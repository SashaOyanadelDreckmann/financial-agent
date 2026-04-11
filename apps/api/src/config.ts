/**
 * config.ts
 *
 * Environment variable validation and configuration.
 * Validates at startup to fail fast on misconfiguration.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z, ZodError } from 'zod';

let envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), '.env');
}
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), 'apps/api/.env');
}
dotenv.config({ path: envPath });

const configSchema = z.object({
  // LLM
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL: z
    .string()
    .default('claude-sonnet-4-6')
    .describe('Anthropic model ID (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5)'),
  ANTHROPIC_TEMPERATURE: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 0.6))
    .describe('Temperature for LLM (0-1)'),

  // Web Server
  PORT: z
    .string()
    .default('3001')
    .transform((v) => Number(v))
    .describe('Server port'),
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .describe('Frontend origin for CORS'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Environment mode'),

  // Sessions
  SESSION_TTL_DAYS: z
    .string()
    .default('7')
    .transform((v) => Number(v))
    .describe('Session TTL in days'),

  // Storage
  DATA_DIR: z
    .string()
    .default('./data')
    .describe('Directory for user data and profiles'),

  // Dev Features
  ENABLE_DEV_INJECTION: z
    .string()
    .default('false')
    .transform((v) => v === 'true')
    .describe('Enable dev-only data injection endpoints'),
  DEV_ADMIN_TOKEN: z
    .string()
    .default('change-me')
    .describe('Admin token for dev endpoints (if ENABLE_DEV_INJECTION=true)'),

  // Logging (optional, defaults built-in)
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info')
    .describe('Pino log level'),
});

export type Config = z.infer<typeof configSchema>;

let _config: Config | null = null;

/**
 * Get validated configuration. Throws if validation fails.
 * Call once at startup in server.ts.
 */
export function getConfig(): Config {
  if (_config) return _config;

  try {
    _config = configSchema.parse(process.env);
    return _config;
  } catch (err) {
    if (err instanceof ZodError) {
      console.error('❌ Configuration validation failed:');
      err.issues.forEach((e: any) => {
        const path = e.path.join('.');
        console.error(`  • ${path}: ${e.message}`);
      });
      process.exit(1);
    }
    throw err;
  }
}

/**
 * Format configuration summary for logging (non-sensitive values only).
 * Call with logger in server.ts after initialization.
 */
export function formatConfigSummary(config: Config): string {
  const lines = [
    '━'.repeat(60),
    '📋 Configuration Summary',
    '━'.repeat(60),
    `  Environment: ${config.NODE_ENV}`,
    `  LLM Model: ${config.ANTHROPIC_MODEL}`,
    `  Port: ${config.PORT}`,
    `  Web Origin: ${config.WEB_ORIGIN}`,
    `  Data Dir: ${config.DATA_DIR}`,
    `  Dev Injection: ${config.ENABLE_DEV_INJECTION ? '🔓 ENABLED' : '🔒 disabled'}`,
  ];

  if (config.ENABLE_DEV_INJECTION && config.NODE_ENV === 'production') {
    lines.push('  ⚠️  WARNING: Dev injection enabled in production!');
  }

  lines.push('━'.repeat(60));
  return lines.join('\n');
}
