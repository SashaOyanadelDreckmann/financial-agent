import { Router } from 'express';
import { runCoreAgent } from '../agents/core.agent/core.agent';
import { ChatAgentInputSchema } from '../agents/core.agent/chat.types';

import { loadUserById, attachProfileToUser, removeInjectedProfileFromUser, attachIntakeToUser, removeInjectedIntakeFromUser } from '../services/user.service';

const router = Router();

// Permite inyectar un perfil diagnóstico en el usuario autenticado
router.post('/inject-profile', (req, res) => {
  const sessionId = req.cookies?.session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { profile } = req.body ?? {};
  if (!profile) {
    return res.status(400).json({ error: 'Missing profile in body' });
  }

  const user = loadUserById(sessionId);
  if (!user) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  const ok = attachProfileToUser(user.id, profile);
  if (!ok) {
    return res.status(500).json({ error: 'Failed to attach profile' });
  }

  return res.json({ ok: true });
});

// Permite inyectar el intake (raw + llmSummary) en el usuario autenticado
router.post('/inject-intake', (req, res) => {
  const sessionId = req.cookies?.session;
  if (!sessionId) return res.status(401).json({ error: 'Not authenticated' });

  const { intake, llmSummary } = req.body ?? {};
  if (!intake) return res.status(400).json({ error: 'Missing intake in body' });

  const user = loadUserById(sessionId);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const ok = attachIntakeToUser(user.id, { intake, llmSummary });
  if (!ok) return res.status(500).json({ error: 'Failed to attach intake' });

  return res.json({ ok: true });
});

// Remove injected intake
router.post('/remove-injected-intake', (req, res) => {
  const sessionId = req.cookies?.session;
  if (!sessionId) return res.status(401).json({ error: 'Not authenticated' });

  const user = loadUserById(sessionId);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const ok = removeInjectedIntakeFromUser(user.id);
  if (!ok) return res.status(500).json({ error: 'Failed to remove injected intake' });

  return res.json({ ok: true });
});

// Elimina el perfil inyectado
router.post('/remove-injected-profile', (req, res) => {
  const sessionId = req.cookies?.session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = loadUserById(sessionId);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const ok = removeInjectedProfileFromUser(user.id);
  if (!ok) return res.status(500).json({ error: 'Failed to remove injected profile' });

  return res.json({ ok: true });
});

// Devuelve información de sesión (usuario y perfil inyectado) para la UI
router.get('/session', (req, res) => {
  const sessionId = req.cookies?.session;
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = loadUserById(sessionId);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  // Omitir passwordHash
  const { passwordHash, ...rest } = user as any;

  return res.json(rest);
});

router.post('/agent', async (req, res) => {
  try {
    /* ────────────────────────────── */
    /* Debug controlado (dev only)    */
    /* ────────────────────────────── */
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.debug(
          '[API /agent] received body:',
          JSON.stringify(req.body, null, 2)
        );
      } catch {
        console.debug('[API /agent] received body (non-serializable)');
      }
    }

    /* ────────────────────────────── */
    /* Normalización de input         */
    /* ────────────────────────────── */
    const normalizedInput = {
      user_id: req.body.user_id,
      user_name: req.body.user_name, // opcional, contexto silencioso
      session_id: req.body.session_id,

      user_message: req.body.user_message ?? req.body.message,

      history: req.body.history ?? [],
      context: req.body.context,
      ui_state: req.body.ui_state,
      preferences: req.body.preferences,
    };

    // Si existe un usuario autenticado con profile o intake inyectados, los añadimos al contexto
    try {
      const sessionId = req.cookies?.session;
      if (sessionId) {
        const user = loadUserById(sessionId);
        if (user && (user as any).injectedProfile) {
          normalizedInput.context = {
            ...(normalizedInput.context ?? {}),
            injected_profile: (user as any).injectedProfile,
          };
        }
        if (user && (user as any).injectedIntake) {
          normalizedInput.context = {
            ...(normalizedInput.context ?? {}),
            injected_intake: (user as any).injectedIntake,
            intake_context: (user as any).injectedIntake?.intakeContext,
          };
        }

      }
    } catch (err) {
      // no romper si falla
      console.warn('Error reading injected context', err);
    }

    /* ────────────────────────────── */
    /* Validación defensiva (Zod)     */
    /* ────────────────────────────── */
    const input = ChatAgentInputSchema.parse(normalizedInput);

    /* ────────────────────────────── */
    /* Ejecución core agent           */
    /* ────────────────────────────── */
    const response = await runCoreAgent(input);

    return res.json(response);
  } catch (err: any) {
    console.error('[AGENT ERROR]', err);

    return res.status(400).json({
      error: 'Invalid agent request',
      details: err?.errors ?? err?.message ?? String(err),
    });
  }
});

export default router;
