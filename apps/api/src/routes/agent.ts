import { Router } from 'express';
import { runCoreAgent } from '../agents/core.agent/core.agent';
import { ChatAgentInputSchema } from '../agents/core.agent/chat.types';

import {
  loadUserById,
  attachProfileToUser,
  removeInjectedProfileFromUser,
  attachIntakeToUser,
  removeInjectedIntakeFromUser,
  saveUserSheets,
  loadUserSheets,
} from '../services/user.service';
import { loadSession } from '../services/session.service';
import { complete } from '../services/llm.service';

const router = Router();

function allowDevInjection(req: any) {
  // default: enabled in non-production, disabled in production unless explicitly allowed
  const enabled =
    process.env.ENABLE_DEV_INJECTION === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (!enabled) return false;

  const token = process.env.DEV_ADMIN_TOKEN;
  if (!token) return true; // no extra gate configured

  const hdr = (req.headers?.['x-dev-admin-token'] ??
    req.headers?.['X-Dev-Admin-Token']) as string | undefined;
  return hdr === token;
}

function getAuthedUser(req: any) {
  const token = req.cookies?.session;
  if (!token) return null;
  const session = loadSession(token);
  if (!session) return null;
  return loadUserById(session.userId);
}

// Permite inyectar un perfil diagnóstico en el usuario autenticado
router.post('/inject-profile', (req, res) => {
  if (!allowDevInjection(req)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { profile } = req.body ?? {};
  if (!profile) {
    return res.status(400).json({ error: 'Missing profile in body' });
  }

  const user = getAuthedUser(req);
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
  if (!allowDevInjection(req)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { intake, llmSummary } = req.body ?? {};
  if (!intake) return res.status(400).json({ error: 'Missing intake in body' });

  const user = getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const ok = attachIntakeToUser(user.id, { intake, llmSummary });
  if (!ok) return res.status(500).json({ error: 'Failed to attach intake' });

  return res.json({ ok: true });
});

// Remove injected intake
router.post('/remove-injected-intake', (req, res) => {
  if (!allowDevInjection(req)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const user = getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const ok = removeInjectedIntakeFromUser(user.id);
  if (!ok) return res.status(500).json({ error: 'Failed to remove injected intake' });

  return res.json({ ok: true });
});

// Elimina el perfil inyectado
router.post('/remove-injected-profile', (req, res) => {
  if (!allowDevInjection(req)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const user = getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Invalid session' });

  const ok = removeInjectedProfileFromUser(user.id);
  if (!ok) return res.status(500).json({ error: 'Failed to remove injected profile' });

  return res.json({ ok: true });
});

/* ──────────────────────────────────── */
/* Sheet persistence                    */
/* ──────────────────────────────────── */
router.get('/sheets', (req, res) => {
  const user = getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const sheets = loadUserSheets(user.id);
  return res.json({ sheets: sheets ?? [] });
});

router.post('/sheets', (req, res) => {
  const user = getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const { sheets } = req.body ?? {};
  if (!Array.isArray(sheets)) return res.status(400).json({ error: 'Invalid sheets payload' });
  const ok = saveUserSheets(user.id, sheets);
  return res.json({ ok });
});

/* ──────────────────────────────────── */
/* Welcome message — personalizado      */
/* ──────────────────────────────────── */
router.get('/welcome', async (req, res) => {
  const user = getAuthedUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const injectedIntake = (user as any).injectedIntake;
  const userName = user.name?.split(' ')[0] ?? 'amigo';

  const SYSTEM_ONBOARDING = 'Eres el mejor asesor financiero personal de Chile. Cálido, directo, experto. Nunca usas emojis. Siempre en español chileno coloquial y profesional. Eres concreto y accionable — nunca genérico.';

  const CAPABILITIES = `Puedo hacer 3 cosas contigo:
1. SIMULAR — proyecciones de ahorro, Monte Carlo, escenarios optimista/base/pesimista con datos reales de Chile (UF, TPM, inflación)
2. ANALIZAR — presupuesto, deudas, APV, metas financieras con números concretos
3. GENERAR INFORMES — PDFs descargables con análisis personalizados que se guardan en tu panel`;

  if (!injectedIntake) {
    try {
      const prompt = `Genera un mensaje de bienvenida didáctico para ${userName}, un usuario nuevo en un asesor financiero personal para Chile.

El mensaje debe:
- Comenzar con su nombre de forma directa y cálida (1 oración)
- Presentar de forma muy concreta estas 3 capacidades: ${CAPABILITIES}
- Mencionar que hay un panel con herramientas que se desbloquean con la conversación
- Terminar con UNA pregunta directa: cuál es su meta financiera principal
- Máximo 5 oraciones, 100 palabras, tono de experto de confianza
- Sin emojis, sin formalismo excesivo

Devuelve SOLO el mensaje, sin comillas ni texto extra.`;

      const message = await complete(
        [{ role: 'system', content: SYSTEM_ONBOARDING }, { role: 'user', content: prompt }],
        { temperature: 0.6 }
      );
      return res.json({
        message: message?.trim() ||
          `${userName}, soy tu asesor financiero personal para Chile. Puedo simular escenarios de ahorro e inversión, analizar tu presupuesto y deudas, y generar informes PDF con tu situación financiera. El panel lateral tiene herramientas que se desbloquean con la conversación. ¿Cuál es tu meta financiera principal ahora mismo?`,
      });
    } catch {
      return res.json({
        message: `${userName}, soy tu asesor financiero personal. Puedo simular proyecciones, analizar tu presupuesto y generar informes PDF. El panel tiene herramientas que se desbloquean conforme conversamos. ¿Cuál es tu meta financiera más importante ahora?`,
      });
    }
  }

  try {
    const intake = injectedIntake.intake ?? injectedIntake;
    const ctx = injectedIntake.intakeContext ?? {};
    const age = intake.age ?? 'no especificada';
    const income = intake.incomeBand ?? 'variable';
    const hasDebt = intake.hasDebt ? 'con deudas activas' : 'sin deudas activas';
    const hasSavings = intake.hasSavingsOrInvestments ? 'con ahorros o inversiones' : 'sin ahorros actualmente';
    const literacy = ctx.financialLiteracy ?? 'medium';
    const stress = intake.moneyStressLevel ?? 5;
    const risk = intake.riskReaction ?? 'hold';

    const prompt = `Genera un mensaje de bienvenida ultra-personalizado y didáctico para ${userName}, un usuario chileno de ${age} años, ${intake.employmentStatus ?? 'empleado'}, ingresos en rango ${income}, ${hasSavings}, ${hasDebt}. Nivel financiero: ${literacy}. Estrés financiero: ${stress}/10. Reacción al riesgo: ${risk}.

El mensaje debe:
- Comenzar con su nombre de forma directa y cálida
- Reconocer 1 aspecto CONCRETO de su situación financiera (sin citar datos sensibles literalmente)
- Mencionar brevemente estas capacidades: ${CAPABILITIES}
- Mencionar que el panel lateral tiene herramientas que se desbloquean
- Proponer 1 acción específica para empezar basada en su perfil
- Terminar con UNA pregunta directa que invite a actuar
- Máximo 5 oraciones, 110 palabras, tono de asesor de confianza en Chile
- Sin emojis, sin formalismo

Devuelve SOLO el mensaje, sin comillas ni texto extra.`;

    const message = await complete(
      [{ role: 'system', content: SYSTEM_ONBOARDING }, { role: 'user', content: prompt }],
      { temperature: 0.65 }
    );

    return res.json({
      message: message?.trim() ||
        `${userName}, tu perfil está cargado. Puedo simular escenarios de inversión, analizar tu presupuesto y generar informes PDF. El panel tiene herramientas que se desbloquean con la conversación. ¿Quieres que empecemos simulando tus ahorros actuales?`,
    });
  } catch (err) {
    console.error('Welcome message error:', err);
    const userName2 = user.name?.split(' ')[0] ?? 'amigo';
    return res.json({
      message: `${userName2}, tu perfil financiero está listo. Puedo simular proyecciones, analizar tu presupuesto y generar informes PDF. El panel se desbloquea conforme avanzamos. ¿Por dónde empezamos?`,
    });
  }
});

// Devuelve información de sesión (usuario y perfil inyectado) para la UI
router.get('/session', (req, res) => {
  const user = getAuthedUser(req);
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
      const authed = getAuthedUser(req);
      if (authed) {
        const user = authed;
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
