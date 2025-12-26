// apps/api/src/agents/interview-question.types.ts

import { InterviewBlockId } from '../orchestrator/conversationFlow';

export interface InterviewQuestion {

  
  /**
   * Bloque al que pertenece la pregunta.
   */
  blockId: InterviewBlockId;  

  /**
   * Texto de la pregunta que se mostrará al usuario.
   * Debe ser clara, abierta y no técnica.
   */
  question: string;

  /**
   * Señal específica que esta pregunta busca confirmar o descartar.
   */
  signalTarget: string;

  /**
   * Orden de la pregunta dentro del bloque (1–3).
   */
  order: number;
    // Metadatos opcionales (no rompen el flujo si no los usas en frontend)
  id?: string;
 
}
