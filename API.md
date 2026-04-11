# API Documentation

## Overview

The Financial Agent API provides conversational financial analysis in Spanish for the Chilean market. Use the Chat Endpoint to ask questions, analyze scenarios, or get financial guidance.

**Base URL:** `http://localhost:3000` (development)

---

## Chat Endpoint

### `POST /api/agents/chat`

Send a message to the agent and receive financial analysis.

#### Request

```bash
curl -X POST http://localhost:3000/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "¿Cuanto debo ahorrar mensualmente para tener 100k en 5 años?",
    "userId": "user@example.com",
    "conversationId": "conv-123",
    "mode": "budgeting"
  }'
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Your question in Spanish (max 2000 chars) |
| `userId` | string | No | Unique user identifier (for rate limiting) |
| `conversationId` | string | No | Conversation ID for multi-turn (UUID) |
| `mode` | string | No | Analysis mode (see modes below) |

**Validation Rules:**
- `message` length: 1-2000 characters
- `message` cannot contain: PII, SQL, command injection patterns
- `userId` format: email-like recommended
- Mode must be one of 9 valid modes

#### Response

**Success (200):**
```json
{
  "success": true,
  "data": {
    "response": "Para ahorrar 100.000 CLP en 5 años (60 meses)...",
    "mode": "budgeting",
    "confidence": 0.87,
    "disclaimer": "Este análisis es orientativo y no constituye...",
    "tools_used": ["finance.budgetAnalyzer", "simpro.montecarlo"],
    "citations": [
      {
        "tool": "finance.budgetAnalyzer",
        "data": {
          "required_monthly_savings": 1666.67,
          "currency": "CLP"
        }
      }
    ],
    "latency_ms": 2450
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Message cannot contain sensitive financial information",
    "field": "message"
  }
}
```

**Error (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 45 seconds.",
    "retryAfter": 45000
  }
}
```

**Error (504):**
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "Analysis timed out. Please try again.",
    "retriable": true
  }
}
```

---

## Analysis Modes

The agent supports 9 specialized modes. If no mode specified, agent auto-detects intent.

### 1. Decision Support (`decision_support`)
**Temperature:** 0.25 (precise, deterministic)

Use when asking for recommendations on financial decisions.

**Example:**
```json
{
  "message": "¿Debo invertir en fondos mutuos o deuda?",
  "mode": "decision_support"
}
```

**Response includes:** Pros/cons, risk assessment, recommendations

**Disclaimer:** "Este análisis es orientativo y no constituye asesoramiento financiero profesional..."

---

### 2. Simulation (`simulation`)
**Temperature:** 0.30 (exploratory)

Use when asking for financial projections and "what-if" scenarios.

**Example:**
```json
{
  "message": "¿Cuánto tendré en 10 años si ahorro 50k mensuales a 5% anual?",
  "mode": "simulation"
}
```

**Tools called:** montecarlo, portfolioProjection

**Response includes:** Projection chart, scenarios (best/worst/expected), probabilities

**Disclaimer:** "Esta es una proyección orientativa basada en supuestos..."

---

### 3. Regulation (`regulation`)
**Temperature:** 0.20 (precise, rules-based)

Use when asking about Chilean financial regulations and rules.

**Example:**
```json
{
  "message": "¿Cuáles son las limitaciones para créditos de hipotecarios?",
  "mode": "regulation"
}
```

**Tools called:** chileRegulatoryLookup, ragLookup

**Response includes:** Official regulations, CMF/SBIF references, dates

**Disclaimer:** "La información regulatoria proviene de fuentes públicas (CMF, SBIF)..."

---

### 4. Information (`information`)
**Temperature:** 0.45 (flexible, exploratory)

Use when asking for general financial information and explanations.

**Example:**
```json
{
  "message": "¿Qué es un fondo mutuo?",
  "mode": "information"
}
```

**Response includes:** Clear explanation, examples, references

---

### 5. Education (`education`)
**Temperature:** 0.50 (narrative, teaching-focused)

Use when asking to learn financial concepts.

**Example:**
```json
{
  "message": "Explícame cómo funciona el interés compuesto",
  "mode": "education"
}
```

**Response includes:** Step-by-step explanation, examples, analogies

---

### 6. Comparison (`comparison`)
**Temperature:** 0.35 (structured comparison)

Use when comparing financial products or strategies.

**Example:**
```json
{
  "message": "¿Cuál es mejor: invertir en fondos mutuos o acciones?",
  "mode": "comparison"
}
```

**Response includes:** Side-by-side comparison table, pros/cons, risk profiles

---

### 7. Budgeting (`budgeting`)
**Temperature:** 0.25 (precise calculations)

Use when creating or analyzing financial budgets.

**Example:**
```json
{
  "message": "Gano 3M y gasto 2M. ¿Cómo maximizo mi ahorro?",
  "mode": "budgeting"
}
```

**Tools called:** budgetAnalyzer, debtAnalyzer, goalPlanner

**Response includes:** Budget breakdown, optimization suggestions, savings plan

---

### 8. Planification (`planification`)
**Temperature:** 0.30 (structured planning)

Use when creating long-term financial plans.

**Example:**
```json
{
  "message": "Quiero jubilarse en 15 años. ¿Cuál es mi plan?",
  "mode": "planification"
}
```

**Response includes:** Multi-year plan, milestones, strategies, risks

---

### 9. Containment (`containment`)
**Temperature:** 0.20 (crisis mode)

Use when facing financial crisis or difficulties.

**Example:**
```json
{
  "message": "Estoy en problemas de deuda. ¿Qué hago?",
  "mode": "containment"
}
```

**Response includes:** Immediate actions, debt management, professional resources

---

## Financial Input Schema

When providing financial data in your message, use clear formats:

**Amounts:**
```
- CLP 100,000 (with comma separator)
- 100000 CLP (number first)
- US$ 5,000 (currency first)
- 5000 USD (number first)
```

**Dates:**
```
- 2024-01-15 (ISO format preferred)
- 15/01/2024 (Chilean format)
- January 15, 2024 (text format)
```

**Account Information:**
```
- Type: "savings", "checking", "investment", "loan", "credit_card"
- Account: 1234567890123456789 (no formatting needed)
```

**Transaction Types:**
```
- "deposit", "withdrawal", "transfer", "payment", "investment"
```

---

## Error Codes

| Code | HTTP | Meaning | Recoverable |
|------|------|---------|------------|
| INVALID_INPUT | 400 | Validation failed (PII, format, etc) | No |
| RATE_LIMITED | 429 | Too many requests | Yes (retry after delay) |
| TIMEOUT | 504 | Analysis took too long | Yes (retry) |
| EXECUTION_FAILED | 500 | Tool execution error | Maybe |
| EXTERNAL_API_ERROR | 500 | External API failed | Yes (retry) |
| SECURITY_ERROR | 403 | Security check failed | No |
| NOT_FOUND | 404 | Resource not found | No |

---

## Rate Limits

The agent enforces per-user rate limits to ensure fair resource usage:

| Tool | Limit | Burst | Window |
|------|-------|-------|--------|
| web.search | 10/min | +2 | 60s |
| web.scrape | 5/min | +1 | 60s |
| market tools | 100/min | +10 | 60s |
| finance tools | 200/min | +20 | 60s |
| pdf.generate | 50/min | +5 | 60s |
| Overall | 500/min | - | 60s |

**Example:** If you hit the limit:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded for web.search: 10 requests/minute",
    "retryAfter": 45000
  }
}
```

---

## Examples

### Example 1: Budget Analysis

**Request:**
```bash
curl -X POST http://localhost:3000/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Gano 5M CLP mensuales y gasto 3.5M. Tengo 2M en ahorros. ¿Cómo invierto?",
    "userId": "user@example.com",
    "mode": "budgeting"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Con tus 1.5M de ahorro mensual (5M - 3.5M), puedes crear una estrategia de inversión diversificada...",
    "mode": "budgeting",
    "confidence": 0.92,
    "disclaimer": "El presupuesto sugerido es orientativo...",
    "tools_used": ["finance.budgetAnalyzer", "finance.goalPlanner"],
    "citations": [
      {
        "tool": "finance.budgetAnalyzer",
        "data": {
          "income": 5000000,
          "expenses": 3500000,
          "savings_rate": 0.30,
          "available_to_invest": 1500000
        }
      }
    ],
    "latency_ms": 1820
  }
}
```

---

### Example 2: Financial Projection

**Request:**
```bash
curl -X POST http://localhost:3000/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Si invierto 500k mensuales a 6% anual durante 10 años, ¿cuánto tendré?",
    "mode": "simulation"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Con una inversión de 500k mensuales a 6% anual durante 10 años...",
    "mode": "simulation",
    "confidence": 0.85,
    "tools_used": ["simpro.montecarlo", "portfolioProjection"],
    "citations": [
      {
        "tool": "portfolioProjection",
        "data": {
          "monthly_contribution": 500000,
          "annual_rate": 0.06,
          "years": 10,
          "final_amount": 79574821,
          "total_contributed": 60000000,
          "earnings": 19574821
        }
      }
    ],
    "latency_ms": 3200
  }
}
```

---

## Response Structure

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    "response": "string (analysis result in Spanish)",
    "mode": "string (one of 9 modes)",
    "confidence": 0.0-1.0,
    "disclaimer": "string (mode-specific disclaimer)",
    "tools_used": ["string[]"],
    "citations": [
      {
        "tool": "string",
        "data": "object (tool-specific data)"
      }
    ],
    "latency_ms": number
  }
}
```

---

## Best Practices

1. **Be Specific**: Include amounts, timeframes, and account types
2. **Use Spanish**: For best results, ask in Spanish
3. **One Question**: Ask one question per request
4. **Realistic Values**: Use plausible financial figures
5. **Wait for Response**: Allow 2-5 seconds for analysis
6. **Retry on Timeout**: If you get a 504, retry after 5 seconds
7. **Respect Rate Limits**: Space requests 100-200ms apart

---

## Support

For API issues: support@financialagent.local

