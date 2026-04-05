import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { simulationsRouter } from './routes/simulations.routes';
import diagnosisRouter from './routes/diagnosis';
import conversationNext from './routes/conversation';
import { submitIntake } from './routes/intake';
import { authRouter } from './routes/auth';
import agentRouter from './routes/agent';
import documentsRouter from './routes/documents';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { errorHandlerMiddleware } from './middleware/errorHandler';
import { getConfig } from './config';

dotenv.config();

export function createApp() {
  const config = getConfig();
  const app = express();

  if (config.NODE_ENV === 'production') {
    // Required for secure cookies behind proxies (Heroku/Render/Nginx, etc.)
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      // API-only server; keep defaults, avoid blocking local embedding/preview.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Request logging (adds correlationId and logger to req)
  app.use(requestLoggerMiddleware);

  // AUTH
  app.use('/auth', authRouter);

  // INTAKE
  app.post('/intake/submit', submitIntake);

  // AGENT CORE
  app.use('/api', agentRouter);
  app.use('/api/documents', documentsRouter);

  // HEALTH
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // CONVERSATION (legacy / flujo anterior)
  app.post('/conversation/next', conversationNext);

  // DIAGNOSIS
  app.use('/', diagnosisRouter);

  app.use('/simulations', simulationsRouter);

  // Global error handler (must be LAST)
  app.use(errorHandlerMiddleware);

  return app;
}

