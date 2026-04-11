// apps/api/src/server.ts
import { createApp } from './app';
import { getConfig, formatConfigSummary } from './config';
import { getLogger, logStartup, logShutdown } from './logger';
import { bootstrapMCP } from './mcp/bootstrap';

// Validate config at startup
const config = getConfig();

// Initialize logger
const logger = getLogger();

// Log configuration
logger.info(formatConfigSummary(config));

// Create and start app
const app = createApp();

const server = app.listen(config.PORT, () => {
  logStartup(`API listening on http://localhost:${config.PORT}`);
});

// MCP bootstrap
try {
  bootstrapMCP();
  logger.info('MCP tools bootstrapped successfully');
} catch (err) {
  logger.error({ msg: 'MCP bootstrap failed', error: err });
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logShutdown('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logShutdown('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
