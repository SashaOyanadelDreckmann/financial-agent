import { Request, Response } from 'express';
import { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';
import { analyzeIntake } from '../agents/intake/intake-analyzer';
import { buildIntakeContext } from '../services/intake-context.service';
import { loadSession } from '../services/session.service';
import { attachIntakeToUser } from '../services/user.service';
import { synchronizeKnowledgeFromIntake, recordKnowledgeEvent } from '../services/knowledge.service';

export async function submitIntake(req: Request, res: Response) {
  const intake = req.body as IntakeQuestionnaire;

  if (!intake) {
    return res.status(400).json({ error: 'Missing intake in request body' });
  }

  if (!intake.employmentStatus || !intake.incomeBand) {
    return res.status(400).json({ error: 'Invalid intake payload' });
  }

  // Análisis determinista
  const signals = analyzeIntake(intake);
  const intakeContext = buildIntakeContext(intake);

  // Análisis LLM (opcional)
  let llmSummary = null;
  try {
    const { analyzeIntakeWithLLM } = await import('../agents/intake/intake-llm');
    llmSummary = await analyzeIntakeWithLLM(intake);
  } catch (err) {
    (req as any).logger?.warn({ msg: 'LLM intake analysis failed', error: err });
  }

  // Auto-inject intake to authenticated user
  try {
    const token = (req as any).cookies?.session;
    if (token) {
      const session = loadSession(token);
      if (session?.userId) {
        attachIntakeToUser(session.userId, { intake, llmSummary, intakeContext } as any);
        await synchronizeKnowledgeFromIntake(session.userId, intake);
        await recordKnowledgeEvent(
          session.userId,
          'completed_intake',
          'User completed financial intake questionnaire',
          { source: 'intake_submit' }
        );
      }
    }
  } catch (err) {
    (req as any).logger?.warn({ msg: 'Failed to auto-inject intake to user', error: err });
  }

  return res.json({
    intake,
    signals,
    intakeContext,
    readyForInterview: true,
    llmSummary,
  });
}
