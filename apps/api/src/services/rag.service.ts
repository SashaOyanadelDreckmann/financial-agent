// apps/api/src/services/rag.service.ts

import type { Citation } from '../agents/core.agent/chat.types';

/**
 * RAG Service (stub inicial)
 *
 * - No rompe el core agent
 * - No depende de DB ni embeddings
 * - Permite evolucionar sin refactor
 */
export async function retrieveRAGContext(
  query: string,
  meta: {
    mode: string;
    intent: string;
  }
): Promise<Citation[]> {
  // RAG aún no implementado
  // RECORDAR Cuando haya vector DB, tengo que reemplazaaquí

  return [];
}
