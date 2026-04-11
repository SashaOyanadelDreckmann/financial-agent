import { z } from 'zod';
import type { FinancialDiagnosticProfile } from './profile.schema';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  injectedProfile: z.any().optional(),
  injectedIntake: z.any().optional(),
  latestDiagnosticProfileId: z.string().optional(),
  latestDiagnosticCompletedAt: z.string().optional(),
  panelState: z.any().optional(),
  // PHASE 9.2: Knowledge tracking with persistent memory
  knowledgeBaseScore: z.number().min(0).max(100).default(0),
  knowledgeScore: z.number().min(0).max(100).default(0),
  knowledgeHistory: z
    .array(
      z.object({
        timestamp: z.string(),
        action: z.string(),
        points: z.number(),
        rationale: z.string(),
      })
    )
    .default([]),
  knowledgeLastUpdated: z.string().default(new Date().toISOString()),
});

export type User = z.infer<typeof UserSchema> & {
  injectedProfile?: FinancialDiagnosticProfile;
  injectedIntake?: {
    intake: any;
    llmSummary?: any;
  };
  latestDiagnosticProfileId?: string;
  latestDiagnosticCompletedAt?: string;
  panelState?: unknown;
};
