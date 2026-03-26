// apps/api/src/routes/conversation.ts

import type { Request, Response } from 'express';

import { InterviewerAgent } from '../agents/interviewer.agent';
import { runDiagnosticAgent } from '../agents/diagnostic/diagnostic.agent';

import {
  buildInterviewPlan,
  InterviewBlockId,
} from '../orchestrator/interview.flow';

import { IntakeQuestionnaire } from '@financial-agent/shared/src/intake/intake-questionnaire.types';

import {
  InterviewBlockEvidence,
} from '../schemas/profile.schema';

import { saveProfile } from '../services/storage.service';
import { loadUserById } from '../services/user.service';
import { loadSession } from '../services/session.service';

const agent = new InterviewerAgent();

/* ───────────────────────────────────────────── */
/* Tipos                                         */
/* ───────────────────────────────────────────── */

export type ConversationNextBody = {
  intake: IntakeQuestionnaire;
  answersInCurrentBlock?: string[];
  completedBlocks?: Partial<
    Record<InterviewBlockId, InterviewBlockEvidence>
  >;
  summaryValidation?: {
    accepted: boolean;
    comment?: string;
  };
  blockId?: InterviewBlockId;
};

type HttpRequest<T> = {
  body: T;
  cookies?: Record<string, string>;
};

type HttpResponse = {
  status: (code: number) => HttpResponse;
  json: (data: unknown) => void;
};

/* ───────────────────────────────────────────── */
/* Core lógico                                   */
/* ───────────────────────────────────────────── */

export async function conversationNextCore(
  req: HttpRequest<ConversationNextBody>,
  res: HttpResponse
) {
  const {
    intake,
    answersInCurrentBlock = [],
    completedBlocks = {},
    summaryValidation,
    blockId: explicitBlockId,
  } = req.body;

  // 🔐 Auth
  const token = req.cookies?.session;
  const session = token ? loadSession(token) : null;
  const user = session ? loadUserById(session.userId) : null;

  if (!user) {
    return res.status(401).json({ error: 'No authenticated user' });
  }

  if (!intake) {
    return res.status(400).json({ error: 'Missing intake' });
  }

  // 🧭 Plan
  const plan = buildInterviewPlan(intake);
  const completedBlockIds = Object.keys(
    completedBlocks
  ) as InterviewBlockId[];

  const currentBlockId =
    explicitBlockId ??
    plan.blocksToExplore.find(
      (b) => !completedBlockIds.includes(b)
    ) ??
    null;

  /* ───────────── FIN ENTREVISTA ───────────── */
  if (!currentBlockId) {
    // 🧠 Ejecutar agente diagnóstico REAL
    const diagnosticProfile = await runDiagnosticAgent({
      intake,
      blocks: completedBlocks,
    });

    // 💾 Persistir
    saveProfile(diagnosticProfile);

    return res.json({
      type: 'interview_complete',
      profile: diagnosticProfile,
    });
  }

  /* ───────────── WARMUP ───────────── */
  if (currentBlockId === 'warmup') {
    if (answersInCurrentBlock.length >= 1) {
      return res.json({
        type: 'block_completed',
        blockId: 'warmup',
        completedBlocks: {
          ...completedBlocks,
          warmup: {
            blockId: 'warmup',
            summary: 'Warmup completado',
            signalsDetected: [],
            confidence: 'high',
            userValidated: true,
          },
        },
      });
    }
  }

  /* ───────────── VALIDACIÓN ───────────── */
  if (summaryValidation && currentBlockId !== 'warmup') {
    if (!summaryValidation.accepted) {
      return res.json({
        type: 'block_revision',
        blockId: currentBlockId,
        userComment: summaryValidation.comment ?? '',
      });
    }

    const prev = completedBlocks[currentBlockId];

    return res.json({
      type: 'block_completed',
      blockId: currentBlockId,
      completedBlocks: {
        ...completedBlocks,
        [currentBlockId]: {
          blockId: currentBlockId,
          summary: prev?.summary ?? '',
          signalsDetected: prev?.signalsDetected ?? [],
          confidence: prev?.confidence ?? 'medium',
          userValidated: true,
        },
      },
    });
  }

  /* ───────────── SIGUIENTE PREGUNTA ───────────── */
  const nextQuestion = await agent.generateNextQuestion({
    blockId: currentBlockId,
    intake,
    answersInCurrentBlock,
    user,
  });

  if (nextQuestion) {
    return res.json({
      type: 'question',
      blockId: currentBlockId,
      question: nextQuestion,
      questionIndex: answersInCurrentBlock.length,
    });
  }

  /* ───────────── RESUMEN DE BLOQUE ───────────── */
  const summary = await agent.summarizeBlock(
    currentBlockId,
    answersInCurrentBlock,
    user
  );

  return res.json({
    type: 'block_summary',
    blockId: currentBlockId,
    summary,
    requiresValidation: true,
  });
}

/* ───────────────────────────────────────────── */
/* Express handler                               */
/* ───────────────────────────────────────────── */

export default async function conversationNext(
  req: Request,
  res: Response
) {
  try {
    await conversationNextCore(
      { body: req.body, cookies: req.cookies as any },
      {
        status: (code) => {
          res.status(code);
          return res as any;
        },
        json: (data) => res.json(data),
      }
    );
  } catch (err) {
    console.error('Error en /conversation/next', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
