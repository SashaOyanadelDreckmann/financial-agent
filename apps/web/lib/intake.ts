// apps/web/lib/intake.ts
import type { IntakeQuestionnaire } from
  '@financial-agent/shared/src/intake/intake-questionnaire.types';

export async function submitIntake(
  data: IntakeQuestionnaire
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/intake/submit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    throw new Error('Error enviando el cuestionario');
  }

  return res.json();
}

  