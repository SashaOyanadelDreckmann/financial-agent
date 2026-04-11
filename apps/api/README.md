# Financial Agent API

A production-grade personal finance advisor backed by Claude AI, CMF-compliant audit logging, and local RAG with 19+ domain-specific documents.

## Quick Start

### Prerequisites
- Node.js 18+ (tested on v20.19.6)
- pnpm (or npm/yarn)

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp ../../.env.example .env
   ```
   Update `.env` with your Anthropic API key and settings:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
   ANTHROPIC_MODEL=claude-sonnet-4-6
   PORT=3000
   WEB_ORIGIN=http://localhost:3001
   ```

3. **Run development server:**
   ```bash
   pnpm dev
   ```
   Server listens on `http://localhost:3000`

4. **Run tests:**
   ```bash
   pnpm test          # Run all tests
   pnpm test:watch    # Watch mode
   pnpm test:coverage # With coverage report
   ```

5. **Type check:**
   ```bash
   pnpm typecheck
   ```

---

## Architecture

### System Design

The API implements a **ReAct pattern** (Reasoning + Acting) for agent-based financial advice:

```
User Query
   ↓
Classification (determine mode & intent)
   ↓
Planning (select tools)
   ↓
Tool Execution (market data, simulations, RAG)
   ↓
Response Generation (with disclaimers & compliance)
```

### Core Components

**Agents** (`src/agents/`)
- **Core Agent**: Main reasoning loop, tool selection, compliance audit logging
- **Diagnostic Agent**: Financial health assessment
- **Intake Agent**: Questionnaire analysis
- **Report Agent**: PDF generation

**Tools** (`src/mcp/tools/`)
- **Market Data**: USD/CLP rates, UF, UTM, TPM (live via mindicador.cl)
- **Simulations**: Monte Carlo, portfolio projections, scenario analysis
- **Finance**: Debt analysis, budgeting, APV optimization
- **RAG**: Keyword-based lookup over 19 domain documents (CMF, fintech law, market data, academic papers)
- **PDF**: Report generation with charts

**Services** (`src/services/`)
- `llm.service.ts` - Claude API integration (complete/completeStructured)
- `rag.service.ts` - Retrieval-augmented generation coordination
- `user.service.ts` - User persistence (file-based with atomic writes)
- `session.service.ts` - Session management (7-day TTL configurable)
- `storage.service.ts` - Profile storage and history

**Middleware** (`src/middleware/`)
- `requestLogger.ts` - Request/response logging with correlation IDs
- `errorHandler.ts` - Global error handling with structured responses

**Configuration** (`src/`)
- `config.ts` - Environment validation (Zod schema)
- `logger.ts` - Structured logging (Pino, JSON in prod, pretty in dev)
- `app.ts` - Express app setup (helmet, CORS, rate limiting)
- `server.ts` - Server startup with graceful shutdown

---

## API Endpoints

### Authentication

**POST `/auth/register`**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password"
}
```
Returns: `{ success: boolean, sessionId?: string }`

**POST `/auth/login`**
```json
{
  "email": "john@example.com",
  "password": "secure_password"
}
```
Returns: `{ success: boolean, sessionId?: string }`

**POST `/auth/logout`**
Clears session cookie.

### Chat & Interaction

**POST `/api/chat`**
Main agent endpoint for financial queries.
```json
{
  "message": "How much should I save for retirement?",
  "mode": "financial_education",
  "intent": "understand_concept"
}
```
Returns: Agent response with citations, React steps, compliance audit log.

**POST `/api/session`**
Get current user + saved sheets.

**GET /api/welcome**
Personalized greeting for authenticated user.

### Intake

**POST `/intake/submit`**
Submit financial questionnaire (IntakeQuestionnaire type).
Returns: LLM analysis + financial diagnostic profile.

### Documents

**POST `/api/documents/parse`**
Parse uploaded PDF/Excel/CSV files.

### Simulations

**POST `/simulations/project`**
Run financial projection simulation.
Returns: PDF report + numerical projections.

### Health

**GET `/health`**
Returns: `{ status: "ok" }`

---

## Environment Variables

| Variable | Type | Default | Required |
|----------|------|---------|----------|
| `ANTHROPIC_API_KEY` | string | - | ✅ |
| `ANTHROPIC_MODEL` | string | `claude-sonnet-4-6` | ❌ |
| `ANTHROPIC_TEMPERATURE` | number | `0.6` | ❌ |
| `PORT` | number | `3000` | ❌ |
| `WEB_ORIGIN` | string | `http://localhost:3001` | ❌ |
| `NODE_ENV` | enum | `development` | ❌ |
| `SESSION_TTL_DAYS` | number | `7` | ❌ |
| `DATA_DIR` | string | `./data` | ❌ |
| `ENABLE_DEV_INJECTION` | boolean | `false` | ❌ |
| `DEV_ADMIN_TOKEN` | string | `change-me` | ❌ |
| `LOG_LEVEL` | enum | `info` | ❌ |

---

## Testing

### Test Organization

```
src/
  agents/core.agent.test.ts          # Agent classification, planning, execution
  services/llm.service.test.ts       # LLM client (mocked)
  mcp/tools/rag/ragLookup.test.ts   # RAG search
  routes/agent.test.ts               # E2E chat endpoint
  test/fixtures.ts                   # Shared test data
  test/helpers.ts                    # Test utilities
```

### Running Tests

```bash
# Run all
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage

# Specific file
pnpm test src/agents/core.agent.test.ts
```

### Coverage Targets

- **Minimum**: 70% lines, functions, branches, statements
- **Focus**: Core agent logic, tool execution, RAG search

---

## Compliance & CMF

The agent includes Chile's CMF (Comisión para el Mercado Financiero) compliance built-in:

1. **Audit Logging** - Every interaction logged with:
   - User ID, timestamp, correlation ID
   - Agent mode, intent, tools used
   - Disclaimer shown, risk score

2. **Disclaimers** - Mode-specific risk warnings:
   - Education mode: general information notice
   - Decision support: professional advice limitation
   - Simulation: hypothetical scenario caveat

3. **Regulation Database** - 19+ local documents:
   - Ley 21,521 (Fintech)
   - NCG 514 (regulations)
   - Market data (tasas, APV, seguros)
   - Academic papers (RAG, ReAct, MCP)

---

## Logging

### Development Output

```
▶ HTTP request method=POST path=/api/chat ip=127.0.0.1 correlationId=abc-123
✔ HTTP response method=POST path=/api/chat statusCode=200 duration=1234ms
```

### Production Output (JSON)

```json
{
  "level": 30,
  "time": "2026-04-05T15:30:00.000Z",
  "correlationId": "abc-123",
  "msg": "HTTP request",
  "method": "POST",
  "path": "/api/chat"
}
```

### Log Levels

- `trace` - Detailed execution flow
- `debug` - Development debugging
- `info` - Normal operation (default)
- `warn` - Warnings
- `error` - Errors
- `fatal` - Application crash

---

## Development

### Adding a New Tool

1. Create tool file: `src/mcp/tools/{category}/{name}.ts`
2. Implement MCPTool interface with Zod validation
3. Register in `src/mcp/bootstrap.ts`
4. Add tests: `src/mcp/tools/{category}/{name}.test.ts`

Example:
```typescript
export const myTool: MCPTool = {
  name: 'category.tool_name',
  description: 'What it does',
  argsSchema: z.object({
    param: z.string(),
  }),
  run: async (args) => {
    // Implementation
    return { data: result };
  },
};
```

### Adding a New Route

1. Create route file: `src/routes/{name}.ts`
2. Export router with validation
3. Mount in `src/app.ts`
4. Add tests: `src/routes/{name}.test.ts`

---

## Production Deployment

### Pre-deployment Checklist

- [ ] All tests pass: `pnpm test`
- [ ] Types check: `pnpm typecheck`
- [ ] No console logs (use logger)
- [ ] Error handling complete
- [ ] Rate limiting configured
- [ ] CORS origin set correctly
- [ ] Dev injection disabled (`ENABLE_DEV_INJECTION=false`)
- [ ] Database/file permissions correct

### Environment Setup

```bash
NODE_ENV=production
PORT=8000
WEB_ORIGIN=https://yourdomain.com
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Monitoring

- Structured JSON logs to stdout
- HTTP error rates (4xx, 5xx)
- Agent response times (target: <2s)
- Tool execution latencies
- Audit log completeness

---

## Troubleshooting

**Issue**: `ANTHROPIC_API_KEY is required`
- **Fix**: Copy `.env.example` to `.env` and set your API key

**Issue**: Tests fail with "Cannot find module"
- **Fix**: Run `pnpm install` from repo root

**Issue**: Server won't start on port 3000
- **Fix**: Change PORT env var or kill process on 3000: `lsof -ti:3000 | xargs kill -9`

**Issue**: RAG returns no results
- **Fix**: Check `apps/rag_data/` has 19+ files; search is keyword-based

---

## Architecture Files

- **`mapa de conexión.md`** - System flow diagram (highly recommended read)
- **`PDF_PIPELINE.md`** - PDF generation workflow
- **`SIMULATIONS_PIPELINE.md`** - Simulation system design
- **`ARCHITECTURE.md`** - Detailed component architecture
- **`API.md`** - Full API specification with examples
- **`TESTING.md`** - Testing guide and patterns

---

## License & Credits

- **Claude AI** - Powered by Anthropic
- **Chilean Finance** - CMF-compliant for Chilean market
- **MCP** - Model Context Protocol for tool integration
