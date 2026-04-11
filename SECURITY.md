# Security Hardening

## Threat Model

The Financial Agent processes sensitive financial data and executes web requests. Key threats:

1. **ReDoS (Regular Expression Denial of Service)**: Attacker submits regex causing exponential backtracking
2. **SSRF (Server-Side Request Forgery)**: Attacker tricks tool into accessing internal services
3. **Injection Attacks**: SQL, command injection via user input
4. **PII Leakage**: Card numbers, SSN exposed in logs or responses
5. **Rate Limit Abuse**: DDoS via tool API calls
6. **Resource Exhaustion**: Large payloads, infinite loops, memory bombs
7. **Timeout/Hang**: Slow external APIs causing service unavailability

---

## Hardening Strategy by Threat

### 1. ReDoS Prevention

**Problem:** User submits `(a+)+b` regex → exponential time on mismatch

**Solution:**
```typescript
// input-sanitizer.ts: sanitizeRegexPattern()
- Detect nested quantifiers: (a+)+, (a|a)*
- Enforce max 200-char pattern length
- Test pattern compiles before use
- Validate flags (only i, g, m allowed)

Example:
const pattern = "(a+)+b";  // BLOCKED
const safe = "a+b";        // ALLOWED
```

**Where Applied:**
- webExtract.tool.ts: regex-based text extraction
- Input validation before any RegExp() creation

**Test Coverage:**
- ✅ Dangerous patterns detected
- ✅ Safe patterns allowed
- ✅ Compile errors caught

### 2. SSRF Prevention

**Problem:** User submits `http://localhost:8080/admin` → tool makes internal request

**Solution:**
```typescript
// input-sanitizer.ts: sanitizeUrl()
- Whitelist protocols: http://, https:// only
- Block private IP ranges:
  * 127.0.0.0/8 (localhost)
  * 10.0.0.0/8 (private)
  * 172.16.0.0/12 (private)
  * 192.168.0.0/16 (private)
  * IPv6 loopback (::1)
  * IPv6 private (fc00::, fe80::)
- Enforce max 2048-char URL length

Example:
sanitizeUrl("http://localhost:3000/api");  // BLOCKED
sanitizeUrl("http://example.com");         // ALLOWED
```

**Where Applied:**
- webSearch.tool.ts: search query URLs
- webScrape.tool.ts: target URLs
- webExtract.tool.ts: content extraction URLs

**Test Coverage:**
- ✅ Localhost blocked
- ✅ Private IPs blocked
- ✅ Public URLs allowed

### 3. Injection Prevention

**SQL Injection Protection:**
```typescript
// validateUserInput() in financial-validator.ts
- Detect: ; DROP TABLE, UNION SELECT, INTO OUTFILE
- Block malicious semicolons followed by commands

Example:
validateUserInput("; DELETE FROM accounts;");  // BLOCKED
```

**Command Injection Protection:**
```typescript
- Detect: $(), `backticks`, &&, ||, |, &
- Block shell command separators

Example:
validateUserInput("test $(rm -rf /)");  // BLOCKED
```

**Where Applied:**
- Core agent mode selection
- User query input
- Financial batch input

**Test Coverage:**
- ✅ SQL patterns blocked
- ✅ Command patterns blocked
- ✅ Safe text allowed

### 4. PII (Personally Identifiable Information) Protection

**Sensitive Data Patterns:**
```typescript
// Detected by containsFinancialPII()
- Credit card: \d{4}-\d{4}-\d{4}-\d{4}
- SSN: \d{3}-\d{2}-\d{4}
- RUT: \d{7,8}-[kK0-9]

Example:
validateUserInput("Card: 4532-1234-5678-9010");  // BLOCKED
```

**Logging Protection:**
- Audit log records only: user_id, mode, tools_used, not amounts
- Error messages don't expose sensitive fields
- No financial values in console logs

**Where Applied:**
- Input validation (reject if PII detected)
- Response generation (don't echo sensitive data)
- Audit logging (exclude amounts, account numbers)

**Test Coverage:**
- ✅ Card numbers detected
- ✅ SSN patterns detected
- ✅ RUT patterns detected

### 5. Rate Limiting

**Problem:** Attacker floods external APIs, exceeding quotas

**Solution:**
```typescript
// rate-limiter.ts
Per-user, per-tool limits (1-minute window):
- web.search: 10 req/min (external API cost)
- web.scrape: 5 req/min (expensive)
- market.tools: 100 req/min (internal cache)
- rag.lookup: 500 req/min (local, no external limit)

Auto-block for 30s if limit exceeded
Burst support: +2-20 requests for short spikes
Global rate limiter tracks all users

Example:
checkRateLimit(userId, "web.search");
// Throws ToolError 429 if > 10 requests in 60 seconds
```

**Where Applied:**
- Before every tool execution (core.agent.ts)
- Enforced at tool runner level

**Test Coverage:**
- ✅ Allows up to limit
- ✅ Blocks on excess
- ✅ Resets after window
- ✅ Burst logic works

### 6. Resource Limits

**Problem:** Attacker submits large payloads, causing memory exhaustion

**Solution:**
```typescript
// input-sanitizer.ts
- String length: max 2000 characters
- Array length: max 1000 items
- Response size: max 5-10MB per tool
- Monte Carlo paths: max 5000 (CPU bound)
- PDF generation timeout: 30 seconds

Exceeded limits → validation error, request rejected
```

**Where Applied:**
- User input validation
- Tool response validation
- Array/batch processing

**Test Coverage:**
- ✅ Oversized inputs rejected
- ✅ Boundary values allowed
- ✅ Error messages clear

### 7. Timeout Protection

**Problem:** External API hangs, blocking agent indefinitely

**Solution:**
```typescript
// In each tool: AbortController with timeout
- Web tools: 5-10 second timeout
- PDF tools: 30 second timeout
- Database tools: 5 second timeout

Example (scrapeDo.tool.ts):
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
const response = await fetch(url, { signal: controller.signal });
clearTimeout(timeout);

On timeout → ToolError 504 Gateway Timeout
```

**Where Applied:**
- webSearch.tool.ts: 5s
- webScrape.tool.ts: 10s
- webExtract.tool.ts: 5s (+ regex timeout 100ms)
- PDF tools: 30s

**Test Coverage:**
- ✅ Timeout after N seconds
- ✅ Resources cleaned up
- ✅ Error message clear

---

## Validation Pyramid

```
┌─────────────────────────────────────────┐
│  Audit Logging                          │  What happened?
│  (CMF Compliance)                       │
├─────────────────────────────────────────┤
│  Error Handling                         │  Did it fail safely?
│  (Standardized ToolError)               │
├─────────────────────────────────────────┤
│  Output Validation                      │  Is response valid?
│  (Size limits, type checks)             │
├─────────────────────────────────────────┤
│  Tool Execution                         │  Can we run it?
│  (Timeout, rate limit, metrics)         │
├─────────────────────────────────────────┤
│  Input Sanitization                     │  Is input safe?
│  (ReDoS, SSRF, injection, PII)         │
├─────────────────────────────────────────┤
│  Input Validation                       │  Is input correct?
│  (Type, range, format, length)          │
└─────────────────────────────────────────┘
```

---

## Security Checklist

- [x] ReDoS protection (regex validation)
- [x] SSRF prevention (URL whitelist)
- [x] Injection prevention (pattern detection)
- [x] PII protection (content filtering)
- [x] Rate limiting (per-user, per-tool)
- [x] Timeout protection (5-30s per tool)
- [x] Size limits (strings, arrays, responses)
- [x] Error handling (standardized, safe messages)
- [x] Audit logging (CMF compliant, no sensitive data)
- [x] Test coverage (>90%)

---

## Known Vulnerabilities & Mitigations

| Vulnerability | Severity | Mitigation | Status |
|---|---|---|---|
| ReDoS via regex | HIGH | Regex validation, length limit | ✅ Fixed |
| SSRF via URL | HIGH | URL whitelist, no private IPs | ✅ Fixed |
| SQL injection | HIGH | Pattern detection | ✅ Fixed |
| PII leakage | MEDIUM | Content filtering, safe logging | ✅ Fixed |
| Rate limit bypass | MEDIUM | Per-user tracking, reset logic | ✅ Fixed |
| Timeout hang | MEDIUM | AbortController per tool | ✅ Fixed |
| Memory bomb | LOW | Size limits, cleanup | ✅ Fixed |
| Type confusion | LOW | Zod schema validation | ✅ Fixed |

---

## Penetration Testing Scenarios

### Scenario 1: ReDoS Attack
```
Input: regex = "(a+)+b"
Expected: validationError("Regex pattern contains...")
Result: ✅ BLOCKED
```

### Scenario 2: SSRF Attack
```
Input: url = "http://localhost:8080/admin"
Expected: securityError("Access to localhost is blocked")
Result: ✅ BLOCKED
```

### Scenario 3: SQL Injection
```
Input: description = "; DROP TABLE users;"
Expected: securityError("Query contains suspicious SQL...")
Result: ✅ BLOCKED
```

### Scenario 4: PII Detection
```
Input: description = "My card is 4532-1234-5678-9010"
Expected: validationError("Input contains sensitive financial...")
Result: ✅ BLOCKED
```

### Scenario 5: Rate Limit Bypass
```
Action: 6 requests in 60s for tool with 5 req/min limit
Expected: 6th request → rateLimitError()
Result: ✅ BLOCKED
```

---

## Security Updates

- **Quarterly**: Review new OWASP Top 10, update patterns
- **Monthly**: Check for ReDoS in new regex patterns
- **Per-release**: Security audit before deployment
- **Real-time**: Monitor rate limit abuse in logs

---

## Contact Security

Found a vulnerability? Email: security@financialagent.local

