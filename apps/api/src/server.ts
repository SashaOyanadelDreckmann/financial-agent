// apps/api/src/server.ts

import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import diagnosisRouter from './routes/diagnosis';

import conversationNext from './routes/conversation';
import { submitIntake } from './routes/intake';
import { authRouter } from './routes/auth';

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

// HEALTH
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// CONVERSATION
app.post('/conversation/next', conversationNext);

app.use('/', diagnosisRouter);

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
