# Architecture: Financial Agent

## System Overview

The Financial Agent is a multi-agent financial analysis system built on TypeScript/Express with specialized tools for Chilean financial markets. It uses Claude AI for conversational analysis and hardened MCP tools for data fetching and calculations.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────▼───────────┐
                │  Input Validation    │
                │ (financial-validator)│
                └──────────┬───────────┘
                           │
                ┌──────────▼────────────────────┐
                │   Core Agent (8 modes)       │
                │  - decision_support          │
                │  - simulation                │
                │  - regulation                │
                │  - education, etc.           │
                └──────────┬────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────┐  ┌──────────▼─────┐  ┌────────▼────────┐
│  MCP Tools │  │ Rate Limiting  │  │  Metrics        │
│ (22 tools) │  │  Framework     │  │  Collection     │
│            │  │                │  │                 │
│ Security:  │  │ Per-user limits│  │ Latency, errors │
│ - Timeout  │  │ Burst support  │  │ Memory tracking │
│ - Validation   │ Config per tool    │ Statistics      │
│ - ReDoS    │  │                │  │                 │
│ - SSRF     │  │                │  │                 │
└────────────┘  └────────────────┘  └─────────────────┘
        │
        └────────────────────┬─────────────────────┐
                   ┌────────▼──────────┐
                   │  Claude AI + LLM  │
                   │  Generates Response
                   │  + Disclaimers    │
                   └────────┬──────────┘
                           │
                ┌──────────▼───────────┐
                │  Audit Logging      │
                │  (CMF Compliance)   │
                └──────────┬───────────┘
                           │
                ┌──────────▼───────────┐
                │  User Response      │
                │  + Citations        │
                └─────────────────────┘
```

---

## Component Architecture

### 1. Input Validation Layer

**File:** `src/validators/financial-validator.ts`

Validates all financial inputs before tool execution:
- `validateAmount()` - Numeric validation, decimal precision, reasonable limits
- `validateAccountType()` - Whitelist: savings, checking, investment, loan, credit_card
- `validateAccountNumber()` - Chilean RUT format validation
- `validateTransactionType()` - Whitelist: deposit, withdrawal, transfer, payment, investment
- `validateDate()` - Date range checks (not future, not >10 years past)
- `validateUserInput()` - Text validation, PII detection, injection prevention

**Rejection Triggers:**
- Invalid type or format
- Out-of-range values
- Presence of PII (card numbers, SSN)
- SQL/command injection patterns
- Oversized inputs

### 2. Core Agent

**File:** `src/agents/core.agent/core.agent.ts`

Orchestrates analysis across 8 modes:
- **decision_support**: Recommends financial actions (0.25 temp)
- **simulation**: Projects financial outcomes (0.30 temp)
- **regulation**: Explains Chilean financial rules (0.20 temp)
- **information**: Provides factual data (0.45 temp)
- **education**: Teaches financial concepts (0.50 temp)
- **comparison**: Compares financial products (0.35 temp)
- **budgeting**: Creates financial plans (0.25 temp)
- **planification**: Long-term strategy (0.30 temp)
- **containment**: Crisis management (0.20 temp)

**Flow:**
1. Validate input (financial-validator)
2. Check rate limit (rate-limiter)
3. Start metrics collection (telemetry)
4. Call LLM with system prompt for mode
5. Parse tool calls
6. Execute MCP tools (with hardening)
7. Aggregate results
8. Generate response + disclaimers
9. Log audit entry
10. Record metrics

### 3. Security & Hardening Framework

**Directory:** `src/mcp/security/`

#### error.ts (~170 lines)
- `ToolError` class: standardized errors with codes
- 8 error codes: INVALID_ARGS, TIMEOUT, RATE_LIMITED, EXECUTION_FAILED, EXTERNAL_API_ERROR, NOT_FOUND, SECURITY_ERROR, RESOURCE_EXHAUSTED
- Helper functions: `validationError()`, `timeoutError()`, `rateLimitError()`, `securityError()`, `wrapError()`, `isRetryableError()`

#### rate-limiter.ts (~280 lines)
- Per-user, per-tool rate limiting
- 1-minute window tracking with burst support
- Default limits: 5-500 req/min depending on tool
- Auto-block for 30s on exceeded limits
- Memory cleanup every 5 minutes

**Rate Limit Defaults:**
```
web.search: 10 req/min (burst 2)
web.extract: 20 req/min (burst 3)
web.scrape: 5 req/min (burst 1)
market.tools: 100 req/min (burst 10)
finance.tools: 200 req/min (burst 20)
rag.lookup: 500 req/min (local, no external limit)
```

#### input-sanitizer.ts (~320 lines)
- **ReDoS Prevention**: Detects dangerous regex patterns, enforces 200-char limit
- **SSRF Prevention**: URL sanitization, blocks localhost/private IPs
- **Input Validation**: Length, numeric range, array size limits
- **PII Detection**: Card numbers, SSN, bank account patterns
- **Injection Prevention**: SQL, command injection patterns

#### telemetry.ts (~300 lines)
- Tracks: execution time, status, error codes, memory delta
- Aggregates: success rate, latency percentiles (p95, p99)
- Per-tool statistics
- Bounded memory (1000 metrics per tool max)

### 4. MCP Tools (22 Total)

**Hardened Tools:**
- **Web Tools** (3): web.search, web.extract, web.scrape
- **Market Tools** (4): dollarCL, tpmCL, ufCL, utmCL
- **Finance Tools** (4): budgetAnalyzer, debtAnalyzer, apvOptimizer, goalPlanner
- **Simulation Tools** (5): montecarlo, portfolioProjection, riskDrawdown, scenarioProjection, simulator
- **PDF Tools** (2): pdf.generate_report (narrative), pdf.generate_simulation
- **RAG & Regulatory** (2): rag.lookup, chileRegulatoryLookup
- **Utilities** (2): time.today, calculator

**Hardening Applied to Each Tool:**
1. Input sanitization (prevent injection, ReDoS)
2. Rate limit check (per user)
3. Metrics collector start
4. Timeout (5-30s depending on tool)
5. Tool execution
6. Error handling (standardized ToolError)
7. Metrics recording
8. Size limit validation

---

## Data Flow: Request → Response

```
REQUEST
  │
  ├─ Validate Input
  │  ├─ Amount validation
  │  ├─ Account type check
  │  ├─ Date range check
  │  ├─ PII detection
  │  ├─ Injection prevention
  │  └─ Length validation
  │
  ├─ Rate Limit Check
  │  ├─ Check user's request count
  │  ├─ Compare against per-tool limit
  │  ├─ Throw ToolError if exceeded
  │  └─ Increment counter
  │
  ├─ Select Agent Mode
  │  ├─ Parse intent
  │  ├─ Choose temperature & disclaimers
  │  └─ Set system prompt
  │
  ├─ Call Claude LLM
  │  ├─ System prompt (mode-specific)
  │  ├─ User input
  │  ├─ Available tools schema
  │  └─ History (if multi-turn)
  │
  ├─ Parse Tool Calls
  │  ├─ Extract tool name
  │  ├─ Extract arguments
  │  └─ Validate against schema
  │
  ├─ Execute Tools (Hardened)
  │  ├─ Sanitize inputs
  │  ├─ Check rate limit
  │  ├─ Start metrics
  │  ├─ Set timeout
  │  ├─ Run tool
  │  ├─ Validate output size
  │  ├─ Record metrics
  │  └─ Handle errors
  │
  ├─ Aggregate Results
  │  ├─ Combine tool outputs
  │  ├─ Format for LLM
  │  └─ Add citations
  │
  ├─ Generate Response
  │  ├─ Call LLM with results
  │  ├─ Add mode disclaimer
  │  ├─ Format response
  │  └─ Include sources
  │
  ├─ Log Audit Entry
  │  ├─ User ID
  │  ├─ Mode
  │  ├─ Tools used
  │  ├─ Risk score
  │  └─ Latency
  │
  └─ RESPONSE
```

---

## Error Handling Strategy

```
Tool Execution
  │
  ├─ Input Validation Error
  │  └─ Return validationError() → 400 Bad Request
  │
  ├─ Rate Limit Exceeded
  │  └─ Return rateLimitError() → 429 Too Many Requests
  │
  ├─ Timeout (5-30s)
  │  └─ Return timeoutError() → 504 Gateway Timeout
  │
  ├─ External API Error
  │  ├─ Determine if retryable (5xx)
  │  ├─ If retryable: exponential backoff (100ms, 200ms, 400ms)
  │  └─ Max 3 retries
  │
  ├─ Security Error (ReDoS, SSRF, injection)
  │  └─ Return securityError() → 403 Forbidden
  │
  └─ Unhandled Error
     └─ Wrap in ToolError → 500 Internal Server Error
```

---

## Audit Logging (CMF Compliance)

Every request generates an audit entry:

```json
{
  "turn_id": "uuid",
  "timestamp": "ISO-8601",
  "user_id": "optional",
  "mode": "decision_support",
  "intent": "should_i_invest_in_stocks",
  "confidence": 0.85,
  "risk_score": 0.3,
  "tools_used": ["market.dollarCL", "finance.budgetAnalyzer"],
  "disclaimers_shown": ["Este análisis es orientativo..."],
  "latency_ms": 2450,
  "error": null
}
```

---

## Performance Targets

| Metric | Target | Achieved |
|--------|--------|----------|
| Total Latency (p95) | <500ms | TBD |
| Tool Execution | <400ms | TBD |
| LLM Inference | <100ms | TBD |
| Memory Delta | <50MB | TBD |
| CPU (single core) | <50% | TBD |
| Test Coverage | >90% | TBD |

---

## Key Decisions & Constraints

1. **Financial Validation First**: All inputs validated before tool calls to ensure data integrity
2. **Per-User Rate Limiting**: Prevents API abuse while allowing reasonable burst traffic
3. **Standardized Error Handling**: Consistent error codes enable client-side error handling
4. **Bounded Metrics**: Max 1000 metrics per tool to prevent memory leaks
5. **Timeout Strategy**: 5-30s depending on tool type (external APIs faster, PDFs slower)
6. **No Sensitive Data Logging**: Audit log contains only IDs, modes, tools, not financial values

---

## Security Model

- ✅ **ReDoS Protection**: Regex patterns validated before compilation
- ✅ **SSRF Prevention**: URLs blocked for localhost/private IPs
- ✅ **Injection Prevention**: SQL/command patterns detected and blocked
- ✅ **PII Protection**: Card numbers, SSN detected and rejected
- ✅ **Rate Limiting**: Per-user limits prevent abuse
- ✅ **Timeout Protection**: All external calls have timeouts
- ✅ **Size Limits**: Responses validated not to exceed 10MB
- ✅ **Input Sanitization**: All user inputs validated before use

