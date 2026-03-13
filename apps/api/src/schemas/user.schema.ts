import { z } from 'zod';
import type { FinancialDiagnosticProfile } from './profile.schema';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  injectedProfile: z.any().optional(),
  injectedIntake: z.any().optional(),
});

export type User = z.infer<typeof UserSchema> & {
  injectedProfile?: FinancialDiagnosticProfile;
  injectedIntake?: {
    intake: any;
    llmSummary?: any;
  };
};
