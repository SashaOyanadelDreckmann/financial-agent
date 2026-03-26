## financial-agent (monorepo)

Workspace `pnpm` con:
- `apps/api`: backend (Express + TS)
- `apps/web`: frontend (Next.js)
- `packages/shared`: tipos/contratos compartidos

**Proyecto de tesis:** prototipo académico para evaluar si un agente conversacional puede levantar contexto financiero, explicar conceptos y generar análisis claros para apoyar decisiones cotidianas.

### Guía del sistema

Documentación completa de funcionalidades en **[docs/GUIA_DEL_SISTEMA.md](docs/GUIA_DEL_SISTEMA.md)**:

- Portada, demo, login/registro
- Intake: cuestionario con situación laboral, ingresos, productos, instituciones de Chile
- Agente: chat, barra de conocimiento, presupuesto profesional, transacciones
- Informes PDF, modo conversación (voz), catálogos financieros
- API y límites del sistema

### Backend (producción)

#### Variables de entorno
Ver `.env.example`. Mínimos:
- `OPENAI_API_KEY`
- `WEB_ORIGIN`

Opcionales (recomendadas):
- `SESSION_TTL_DAYS`: días de vida de la sesión (default 7)
- `ENABLE_DEV_INJECTION`: habilita endpoints dev-only (default false en producción)
- `DEV_ADMIN_TOKEN`: token para proteger endpoints dev-only (si se configura)
- `DATA_DIR`: directorio base para persistencia local (default `./data`)

#### Ejecutar

```bash
pnpm -C apps/api dev
```

#### Auth / sesiones
- Cookie `session` guarda un **token aleatorio** (no el `userId`).
- Sesiones persisten en `DATA_DIR/sessions/` con expiración.
- Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /api/session`.

#### Persistencia local
Para tesis/MVP se usa filesystem local (`DATA_DIR`). En producción real se recomienda reemplazar por DB/Redis/S3 según el caso.

### CI
Se incluye workflow GitHub Actions para `apps/api` (typecheck + tests).

