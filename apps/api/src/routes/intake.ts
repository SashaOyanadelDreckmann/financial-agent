import { Request, Response } from 'express';
import { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';
import { analyzeIntake } from '../agents/intake/intake-analyzer';

export async function submitIntake(req: Request, res: Response) {
  const intake = req.body as IntakeQuestionnaire;

  // 1️⃣ Validación mínima
  if (!intake) {
    return res.status(400).json({
      error: 'Missing intake in request body',
    });
  }

  // 2️⃣ Validación básica de forma
  if (!intake.employmentStatus || !intake.incomeBand) {
    return res.status(400).json({
      error: 'Invalid intake payload',
    });
  }

  // 3️⃣ Análisis determinista
  const signals = analyzeIntake(intake);

  // 4️⃣ Respuesta clara
  return res.json({
    intake,
    signals,
    readyForInterview: true,
  });
}
