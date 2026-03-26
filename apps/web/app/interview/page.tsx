// apps/web/app/interview/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { QuestionCard } from '@/components/conversation/QuestionCard';
import { SummaryCard } from '@/components/conversation/SummaryCard';

import { useInterviewStore } from '@/state/interview.store';
import { useProfileStore } from '@/state/profile.store';

import { nextConversationStep } from '@/lib/api';

export default function InterviewPage() {
  const router = useRouter();
  const bootedRef = useRef(false);

  const {
    intake,
    answersByBlock,
    completedBlocks,
    lastResponse,
    addAnswer,
    resetBlock,
    setResponse,
  } = useInterviewStore();

  const { setProfile } = useProfileStore();

  // Guard
  useEffect(() => {
    if (!intake) router.replace('/intake');
  }, [intake, router]);

  // Boot
  useEffect(() => {
    if (!intake || bootedRef.current || lastResponse) return;
    bootedRef.current = true;

    nextConversationStep({
      intake,
      completedBlocks,
    }).then(setResponse);
  }, [intake, completedBlocks, lastResponse, setResponse]);

  // Avance automático
  useEffect(() => {
    if (lastResponse?.type !== 'block_completed') return;

    const updatedCompleted =
      lastResponse.completedBlocks ?? completedBlocks;

    nextConversationStep({
      intake,
      completedBlocks: updatedCompleted,
    }).then((res) => {
      if (res?.blockId) resetBlock(res.blockId);
      setResponse(res);
    });
  }, [lastResponse, intake, completedBlocks, resetBlock, setResponse]);

  // 🎯 FIN ENTREVISTA
  useEffect(() => {
    if (lastResponse?.type === 'interview_complete') {
      setProfile(lastResponse.profile);
      router.push('/diagnosis');
    }
  }, [lastResponse, setProfile, router]);

  if (!intake || !lastResponse) return null;

  const blockId = lastResponse.blockId;
  const answersInBlock = blockId
    ? answersByBlock[blockId] ?? []
    : [];

  return (
    <div className="interview-shell pro-interview-shell">
      <div className="animated-bg interview-bg" aria-hidden />
      <div className="interview-column pro-interview-column">

        {lastResponse.type === 'question' && blockId && (
          <QuestionCard
            question={lastResponse.question}
            onSubmit={async (answer) => {
              const clean = answer?.trim();
              if (!clean) return;

              addAnswer(blockId, clean);

              const res = await nextConversationStep({
                intake,
                blockId,
                answersInCurrentBlock: [
                  ...answersInBlock,
                  clean,
                ],
                completedBlocks,
              });

              setResponse(res);
            }}
          />
        )}

        {lastResponse.type === 'block_summary' && blockId && (
          <SummaryCard
            summary={lastResponse.summary}
            onAccept={async () => {
              const res = await nextConversationStep({
                intake,
                blockId,
                completedBlocks,
                summaryValidation: { accepted: true },
              });
              setResponse(res);
            }}
            onReject={async (comment) => {
              const res = await nextConversationStep({
                intake,
                blockId,
                completedBlocks,
                summaryValidation: {
                  accepted: false,
                  comment,
                },
              });
              setResponse(res);
            }}
          />
        )}
      </div>
    </div>
  );
}
