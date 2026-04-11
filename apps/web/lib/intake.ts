// apps/web/lib/intake.ts
import type { IntakeQuestionnaire } from
  '@financial-agent/shared/src/intake/intake-questionnaire.types';
import { getApiBaseUrl } from './apiBase';

export async function submitIntake(
  data: IntakeQuestionnaire
) {
  const API_URL = getApiBaseUrl();
  const res = await fetch(
    `${API_URL}/intake/submit`,
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

  
