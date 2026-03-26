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

dotenv.config();

export function createApp() {
  const app = express();

  if (process.env.NODE_ENV === 'production') {
    // Required for secure cookies behind proxies (Heroku/Render/Nginx, etc.)
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      // API-only server; keep defaults, avoid blocking local embedding/preview.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
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
      origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001',
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

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

  return app;
}

