import { Request, Response } from 'express';
import { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';
import { analyzeIntake } from '../agents/intake/intake-analyzer';
import { buildIntakeContext } from '../services/intake-context.service';

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

  // 3.1️⃣ Contexto derivado (nuevo)
  const intakeContext = buildIntakeContext(intake);

  // 3.2️⃣ Análisis LLM (opcional)
  let llmSummary = null;
  try {
    const { analyzeIntakeWithLLM } = await import(
      '../agents/intake/intake-llm'
    );

    llmSummary = await analyzeIntakeWithLLM(intake);
  } catch (err) {
    console.error('LLM intake analysis failed:', err);
    llmSummary = null;
  }

  // 4️⃣ Respuesta clara
  return res.json({
    intake,
    signals,
    intakeContext,
    readyForInterview: true,
    llmSummary,
  });
}
