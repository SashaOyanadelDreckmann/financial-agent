# API Specification

All endpoints require proper `Content-Type: application/json` headers. Responses include `correlationId` for request tracing.

## Authentication Endpoints

### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "name": "Juan García",
  "email": "juan@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid-123",
    "name": "Juan García",
    "email": "juan@example.com"
  }
}
```

**Errors:**
- `400 VALIDATION_ERROR` - Invalid input (email format, weak password)
- `409 CONFLICT` - Email already registered

---

### POST /auth/login

Authenticate user and create session.

**Request:**
```json
{
  "email": "juan@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid-123",
    "name": "Juan García"
  }
}
```
*Note: Session cookie set automatically*

**Errors:**
- `400 VALIDATION_ERROR` - Missing fields
- `401 AUTH_ERROR` - Invalid credentials

---

### POST /auth/logout

Destroy session and clear cookies.

**Request:**
```json
{}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## Agent Endpoints

### POST /api/chat

Main endpoint for financial advisory conversations.

**Request:**
```json
{
  "message": "¿Cuánto debo ahorrar mensualmente para la jubilación?",
  "mode": "financial_education",
  "intent": "understand_concept"
}
```

**Modes:** education, decision_support, simulation, quick_answer, diagnosis, compliance_check, error_recovery

**Response (200 OK):**
```json
{
  "success": true,
  "response": {
    "text": "Para una jubilación cómoda...",
    "citations": [
      {
        "doc_title": "APV Ahorro Previsional",
        "supporting_span": "El APV es...",
        "confidence": 0.85
      }
    ],
    "react": {
      "steps": [
        {
          "step": 1,
          "goal": "Gather user financial data",
          "decision": "Selected tool: market.uf_cl"
        }
      ]
    },
    "compliance": {
      "mode": "financial_education",
      "disclaimer": "Educational information...",
      "riskScore": 0.3,
      "auditLog": { ... }
    }
  }
}
```

**Errors:**
- `400 INVALID_REQUEST` - Missing message
- `401 AUTH_ERROR` - Not authenticated
- `500 INTERNAL_ERROR` - LLM or tool failure

---

### POST /api/session

Get current authenticated user and saved data.

**Request:**
```json
{}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "user-uuid-123",
    "name": "Juan García",
    "email": "juan@example.com"
  },
  "sheets": [
    {
      "id": "sheet-001",
      "name": "Mi Presupuesto Mensual",
      "data": { ... }
    }
  ]
}
```

**Errors:**
- `401 AUTH_ERROR` - Not authenticated

---

### GET /api/welcome

Get personalized welcome message for authenticated user.

**Response (200 OK):**
```json
{
  "greeting": "¡Hola Juan! ¿En qué puedo ayudarte hoy?",
  "lastVisit": "2026-04-01T10:30:00Z",
  "pendingItems": 2
}
```

---

## Intake Endpoints

### POST /intake/submit

Submit financial questionnaire for analysis.

**Request:**
```json
{
  "name": "Juan García",
  "age": 35,
  "monthlyIncome": 3500000,
  "monthlyExpenses": 1800000,
  "dependents": 2,
  "currentSavings": 5000000,
  "riskTolerance": "moderate",
  "goals": [
    {
      "name": "Educación hijos",
      "amount": 20000000,
      "timeline": 5
    },
    {
      "name": "Casa propia",
      "amount": 100000000,
      "timeline": 10
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "analysis": {
    "financialHealth": {
      "score": 7.2,
      "strengths": ["Buen ahorro mensual", "Bajo endeudamiento"],
      "weaknesses": ["Diversificación limitada"]
    },
    "recommendations": [
      {
        "priority": "high",
        "action": "Abrir cuenta APV",
        "reasoning": "Máxima desgravación tributaria"
      }
    ]
  },
  "profile": {
    "userId": "user-uuid-123",
    "createdAt": "2026-04-05T15:30:00Z"
  }
}
```

---

## Document Endpoints

### POST /api/documents/parse

Parse and extract data from PDF/Excel/CSV files.

**Request:**
```
Content-Type: multipart/form-data

file: [PDF or Excel file]
```

**Response (200 OK):**
```json
{
  "success": true,
  "document": {
    "filename": "transacciones.pdf",
    "type": "pdf",
    "pageCount": 5,
    "extractedText": "...",
    "tables": [
      {
        "headers": ["Fecha", "Descripción", "Monto"],
        "rows": [ ... ]
      }
    ]
  }
}
```

**Errors:**
- `400 INVALID_REQUEST` - Missing file
- `413 FILE_TOO_LARGE` - File exceeds 10MB limit

---

## Simulation Endpoints

### POST /api/simulations/project

Run financial projection simulation.

**Request:**
```json
{
  "monthlyIncome": 3500000,
  "monthlyExpenses": 1800000,
  "currentSavings": 5000000,
  "monthlyContribution": 700000,
  "years": 10,
  "simulationType": "monte_carlo",
  "variables": {
    "inflationRate": 0.03,
    "investmentReturn": 0.08,
    "volatility": 0.15
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "simulation": {
    "type": "monte_carlo",
    "iterations": 1000,
    "projections": {
      "pessimistic": {
        "year10Balance": 95000000,
        "percentile": 10
      },
      "expected": {
        "year10Balance": 125000000,
        "percentile": 50
      },
      "optimistic": {
        "year10Balance": 165000000,
        "percentile": 90
      }
    },
    "pdf": {
      "url": "https://...",
      "filename": "projection_2026.pdf"
    }
  }
}
```

---

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "timestamp": "2026-04-05T15:30:00Z",
    "correlationId": "abc-123-def-456",
    "details": { ... }
  }
}
```

**Common Error Codes:**
- `INVALID_REQUEST` (400) - Malformed request
- `VALIDATION_ERROR` (400) - Zod validation failure
- `AUTH_ERROR` (401) - Authentication failure
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists
- `INTERNAL_ERROR` (500) - Server error

---

## Rate Limiting

All endpoints are rate-limited:
- **Window**: 15 minutes
- **Max Requests**: 300 per window
- **Headers**: `X-RateLimit-*` included in responses

---

## Authentication

All endpoints except `/auth/register` and `/auth/login` require:
1. Valid session cookie (set after login)
2. Or: Authorization header with session token

```
Cookie: session=token123
```

or

```
Authorization: Bearer token123
```

---

## Pagination

List endpoints support optional pagination:

```json
{
  "limit": 10,
  "offset": 0
}
```

Response includes:

```json
{
  "items": [ ... ],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

---

## Webhooks (Coming Soon)

Future: Event-based notifications for agent actions, simulations completed, etc.

---

## OpenAPI Spec

Full OpenAPI 3.0 specification available at `/api/openapi.json` (coming in v2.0)
