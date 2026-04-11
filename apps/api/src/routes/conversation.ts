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
import { appendMemoryTimelineNote } from '../services/memory.service';

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
  const interviewChatId = `interview:${user.id}`;
  const joinedAnswers = answersInCurrentBlock.join(' | ');

  /* ───────────── FIN ENTREVISTA ───────────── */
  if (!currentBlockId) {
    // 🧠 Ejecutar agente diagnóstico REAL
    const diagnosticProfile = await runDiagnosticAgent({
      intake,
      blocks: completedBlocks,
    });

    // 💾 Persistir
    saveProfile(diagnosticProfile);
    appendMemoryTimelineNote({
      userId: user.id,
      chatId: interviewChatId,
      userMessage: joinedAnswers || 'Entrevista financiera completada',
      agentMessage: diagnosticProfile.diagnosticNarrative,
      mode: 'diagnostic_interview',
      summary: 'Entrevista completada y perfil diagnóstico persistido.',
      facts: [
        {
          type: 'decision',
          key: 'diagnostic_profile',
          value: diagnosticProfile.diagnosticNarrative,
          confidence: 0.95,
        },
        {
          type: 'risk_profile',
          key: 'time_horizon',
          value: diagnosticProfile.profile.timeHorizon,
          confidence: 0.85,
        },
      ],
    });

    return res.json({
      type: 'interview_complete',
      profile: diagnosticProfile,
    });
  }

  /* ───────────── WARMUP ───────────── */
  if (currentBlockId === 'warmup') {
    if (answersInCurrentBlock.length >= 1) {
      appendMemoryTimelineNote({
        userId: user.id,
        chatId: interviewChatId,
        userMessage: joinedAnswers || 'Warmup de entrevista',
        agentMessage: 'Warmup completado',
        mode: 'diagnostic_interview',
        summary: 'Warmup de entrevista financiera completado.',
      });
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
      appendMemoryTimelineNote({
        userId: user.id,
        chatId: interviewChatId,
        userMessage: summaryValidation.comment ?? 'Solicitud de revisión de bloque',
        agentMessage: `Bloque ${currentBlockId} marcado para revisión`,
        mode: 'diagnostic_interview',
        summary: `Usuario pidió revisar el bloque ${currentBlockId}.`,
      });
      return res.json({
        type: 'block_revision',
        blockId: currentBlockId,
        userComment: summaryValidation.comment ?? '',
      });
    }

    const prev = completedBlocks[currentBlockId];

    appendMemoryTimelineNote({
      userId: user.id,
      chatId: interviewChatId,
      userMessage: joinedAnswers || `Validación del bloque ${currentBlockId}`,
      agentMessage: `Bloque ${currentBlockId} validado`,
      mode: 'diagnostic_interview',
      summary: `Bloque ${currentBlockId} validado por el usuario.`,
    });
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
    appendMemoryTimelineNote({
      userId: user.id,
      chatId: interviewChatId,
      userMessage: joinedAnswers || `Continuar bloque ${currentBlockId}`,
      agentMessage: nextQuestion,
      mode: 'diagnostic_interview',
      summary: `Nueva pregunta generada para el bloque ${currentBlockId}.`,
    });
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

  appendMemoryTimelineNote({
    userId: user.id,
    chatId: interviewChatId,
    userMessage: joinedAnswers || `Resumen bloque ${currentBlockId}`,
    agentMessage: summary,
    mode: 'diagnostic_interview',
    summary: `Resumen generado para el bloque ${currentBlockId}.`,
  });

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
    (req as any).logger?.error({ msg: 'Error en /conversation/next', error: err });
    res.status(500).json({ error: 'Internal server error' });
  }
}
