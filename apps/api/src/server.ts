// apps/api/src/server.ts
import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { simulationsRouter } from './routes/simulations.routes';

import diagnosisRouter from './routes/diagnosis';
import conversationNext from './routes/conversation';
import { submitIntake } from './routes/intake';
import { authRouter } from './routes/auth';
import agentRouter from './routes/agent'; // 👈 NUEVO


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// AUTH
app.use('/auth', authRouter);

// INTAKE
app.post('/intake/submit', submitIntake);

// AGENT CORE 👇
app.use('/api', agentRouter);

// HEALTH
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// CONVERSATION (legacy / flujo anterior)
app.post('/conversation/next', conversationNext);

// DIAGNOSIS
app.use('/', diagnosisRouter);

app.use('/simulations', simulationsRouter);
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});

/* MCP bootstrap */
import { bootstrapMCP } from './mcp/bootstrap';
bootstrapMCP();
