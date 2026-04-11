# FASE 4 Specification: World-Class Financial Agent

**Project:** Financial Agent (Tesis)
**Phase:** 4 - Integration, Optimization & Thesis-Ready
**Generated:** 2026-04-11
**Target:** Production-ready, thesis-defense quality

---

## Executive Summary

Complete the financial agent into a world-class system with:
- ✅ 100% financial input validation (amounts, accounts, types)
- ✅ 18→22 MCP tools fully hardened + tested
- ✅ >90% test coverage with edge case testing
- ✅ <500ms response time (p95)
- ✅ Zero financial errors, no crashes
- ✅ Thesis-ready documentation & comments
- ✅ Security audit passing
- ✅ Ready for defense/production deployment

---

## Current State (FASE 3 Summary)

### ✅ Completed
- **FASE 1:** core.agent.ts refactored into 5 modular components
- **FASE 2:** 8 test files created (~2450 LOC)
- **FASE 3:** Security framework (error.ts, rate-limiter.ts, input-sanitizer.ts, telemetry.ts)
- **Tools Hardened:** 18/22 MCP tools with validation, rate limiting, timeout handling

### ⏳ Remaining (4 tools)
- `scrapeDo`: timeout (10s), size limits (5MB), retry logic
- `calculateor`: metrics collection
- `today`: metrics collection
- `generateNarrativePdf`, `generateSimulationPdf`: timeouts (30s), output size limits

---

## FASE 4 Requirements

### 1. Complete MCP Tool Hardening (4 Remaining Tools)

**scrapeDo.tool.ts**
- Add 10s timeout with AbortController
- Response size limit: 5MB max
- Retry logic (exponential backoff, max 3 retries)
- Implement rate limiting (checkRateLimit)
- Full metrics collection (telemetry)
- Error handling (standardized ToolError)

**calculateor.tool.ts**
- Numeric input validation (min/max bounds)
- Telemetry metrics collection
- Error handling wrapper

**today.tool.ts**
- Telemetry metrics collection
- Simple utility wrapping

**PDF Generation Tools (generateNarrativePdf.tool.ts, generateSimulationPdf.tool.ts)**
- Generation timeout: 30s per PDF
- Output size limit: 10MB max
- Memory cleanup after generation
- Error handling + telemetry
- Test PDF generation under load

### 2. Financial Input Validation (100% Coverage)

**Create: validators/financial-validator.ts (~200 lines)**
- `validateAmount(value, min, max, currency?)`: Validate monetary amounts
  - Check: positive number, ≤ 999,999,999 (reasonable limit)
  - Decimal precision: max 2 places
  - Currency validation if provided
- `validateAccountType(type)`: Check against whitelist
  - Valid: 'savings', 'checking', 'investment', 'loan', 'credit_card'
  - Reject unknown types
- `validateAccountNumber(number)`: Format validation (Chilean RBAN)
  - 18-22 digits
  - Pattern: TTCCBBAAAAAAAAAAAAC (type + bank code + account + check digit)
- `validateTransactionType(type)`: whitelist validation
  - Valid: 'deposit', 'withdrawal', 'transfer', 'payment', 'investment'
- `validateDate(date)`: Ensure valid date range
  - Not in future
  - Not more than 10 years past
- `validateUserInput(text, mode)`: Text sanitization
  - Max 2000 chars
  - Reject SQL injection patterns
  - Reject financial PII (card numbers, SSN)

**Integrate into core.agent.ts**
- Call validators before MCP tool execution
- Return clear error messages for failed validation
- Log validation failures in audit trail

### 3. Comprehensive Testing (>90% Coverage)

**Update/Create Test Files**

**core.agent.test.ts**
- Happy path: Each of 8 modes (decision_support, simulation, regulation, etc.)
- Error paths: Invalid inputs, network failures, MCP tool errors
- Rate limiting: Verify limits enforced per user
- Timeout: Verify 5s timeout on tools
- Financial validation: Reject invalid amounts/accounts/types
- Disclaimer generation: Verify all 8 disclaimers present
- Audit logging: Verify entries logged correctly
- Edge cases:
  - Zero amounts
  - Boundary amounts (999,999,999)
  - Special characters in text
  - Very long inputs (>2000 chars)

**financial-validator.test.ts** (~150 lines)
- Amount validation: valid, invalid, boundary, decimal precision
- Account type: all valid types, invalid types, case sensitivity
- Account number: valid RBAN, invalid formats, edge lengths
- Transaction type: all valid types, invalid
- Date validation: today, past, boundary, invalid dates
- User input: normal, with PII, SQL injection attempts, unicode

**MCP tools integration tests** (~200 lines per critical tool)
- webSearch: query limits, timeout behavior, error handling
- webExtract: ReDoS patterns, SSRF blocking, regex timeout
- montecarlo: path limits, CPU timeout, accuracy
- Each tool: rate limit blocking, metrics collection, error wrapping

**End-to-end scenarios** (~100 lines)
- Complete financial planning flow (question → analysis → tools → response)
- Budget analysis + debt planning (multi-tool orchestration)
- Error recovery: tool failure → fallback → response
- Performance: measure latency, p95 < 500ms

**Test Configuration**
- Coverage threshold: >90% (fail CI if lower)
- Test timeout: 10s per test
- Parallel: Run tests in parallel

### 4. Performance Optimization

**Latency Targets**
- Tool execution: <400ms (p95)
- Response generation: <100ms (p95)
- Total end-to-end: <500ms (p95)

**Profiling & Optimization**
- Measure baseline: `time npm test`
- Identify bottlenecks: use Node.js profiler
- Optimize:
  - Cache LLM prompts (system messages)
  - Batch MCP tool calls where possible
  - Lazy-load large dependencies
  - Memory pooling for telemetry buffers

**Monitoring**
- Log execution time per phase
- Track memory usage delta per request
- Record p95/p99 latencies
- Alert if latency exceeds threshold

### 5. Documentation & Code Quality

**Code Quality**
- TypeScript: `strict: true` in tsconfig
- No console.warn/error in production code
- No `any` types (except explicit escape hatches with comment)
- JSDoc comments on all exports
- Inline comments on complex logic

**Documentation**
- **CLAUDE.md**: Already created (✅)
- **API.md**: Document all agent modes, inputs, outputs
  - Mode descriptions & appropriate use cases
  - Input schema examples
  - Output structure
  - Error codes & meanings
- **ARCHITECTURE.md**: System design
  - Component diagram (core.agent → validators → tools → response)
  - Data flow (input → validation → MCP → response)
  - Error handling flow
- **TESTING.md**: Test strategy
  - What's tested (happy/error/edge paths)
  - How to run tests
  - Coverage report location
- **SECURITY.md**: Security hardening details
  - ReDoS protection
  - SSRF prevention
  - Rate limiting strategy
  - Input sanitization approach

**Code Comments**
- Financial validation logic: explain why each check exists
- Tool invocation: document error handling strategy
- Telemetry: explain metric meaning
- Audit logging: explain CMF compliance

### 6. Security Audit & Validation

**Security Checklist**
- [ ] All 22 MCP tools hardened (timeout, rate limit, validation)
- [ ] No ReDoS vulnerabilities (regex patterns validated)
- [ ] No SSRF vulnerabilities (URLs blocked for private IPs)
- [ ] Financial PII not exposed (passwords, card numbers, SSN)
- [ ] Rate limiting working (tested with load)
- [ ] Error messages don't leak sensitive data
- [ ] Audit log protecting user privacy (no passwords logged)
- [ ] Input validation preventing injection (SQL, command, regex)

**Performance Validation**
- [ ] P95 latency <500ms (measured with load)
- [ ] Memory usage stable (no leaks, bounded buffers)
- [ ] CPU usage reasonable (<50% single core)

**Functional Validation**
- [ ] All 8 modes working (decision_support, simulation, etc.)
- [ ] Tests passing (>90% coverage)
- [ ] No type errors (`tsc --noEmit`)
- [ ] Disclaimers showing correctly
- [ ] Audit log generating entries

---

## Implementation Plan (Phases 1-5)

### Phase 1: Complete Tool Hardening (2-3 hours)
1. Harden remaining 4 tools (scrapeDo, calculateor, today, PDF tools)
2. Add tests for each tool integration
3. Verify no regressions

### Phase 2: Financial Validation (2-3 hours)
1. Create financial-validator.ts with 5 validation functions
2. Integrate into core.agent.ts
3. Add validator tests (100% coverage)
4. Update audit logging for validation failures

### Phase 3: Comprehensive Testing (3-4 hours)
1. Update core.agent.test.ts (happy + error + edge cases)
2. Create financial-validator.test.ts
3. Add MCP tool integration tests
4. Add end-to-end scenarios
5. Measure coverage (target: >90%)
6. Fix gaps to reach threshold

### Phase 4: Performance & Documentation (2-3 hours)
1. Profile latency (baseline measurement)
2. Optimize bottlenecks (caching, lazy loading, pooling)
3. Measure final p95 (<500ms)
4. Create ARCHITECTURE.md, TESTING.md, SECURITY.md
5. Add JSDoc comments to exports
6. Inline comments on complex logic

### Phase 5: Security Audit & Final Validation (1-2 hours)
1. Security checklist review
2. Functional validation
3. Performance validation
4. Final commits with detailed messages
5. Ready for thesis defense

---

## Success Criteria

### Functional
- ✅ All 8 agent modes working
- ✅ All 22 MCP tools integrated & hardened
- ✅ 100% financial input validation (amounts, accounts, types)
- ✅ Error handling: no crashes, clear error messages
- ✅ Audit logging: all operations logged (CMF compliance)

### Quality
- ✅ Test coverage: >90% (measured with c8)
- ✅ Type safety: No `any` types (except escapes with comments)
- ✅ Code style: Consistent formatting (Prettier/ESLint)
- ✅ Documentation: 4 README files (ARCHITECTURE, TESTING, SECURITY, API)
- ✅ Comments: All exports documented, complex logic explained

### Performance
- ✅ Latency p95: <500ms (end-to-end)
- ✅ Memory: No leaks, bounded buffers
- ✅ CPU: <50% single core under normal load

### Security
- ✅ ReDoS: Protected (regex validation)
- ✅ SSRF: Protected (URL whitelist)
- ✅ Injection: Protected (input sanitization)
- ✅ Rate limiting: Enforced
- ✅ Audit log: Comprehensive & privacy-preserving

### Thesis-Ready
- ✅ Production-grade code quality
- ✅ Comprehensive documentation
- ✅ Security hardening demonstrated
- ✅ Performance benchmarks included
- ✅ Test coverage metrics available
- ✅ Ready for defense presentation

---

## Deliverables

| Deliverable | Type | Status | Notes |
|---|---|---|---|
| 4 remaining tools hardened | Code | Pending | scrapeDo, calculateor, today, PDF tools |
| financial-validator.ts | Code | Pending | ~200 lines, 5 validation functions |
| Updated test files | Code | Pending | >90% coverage goal |
| core.agent.test.ts | Code | Pending | ~300 lines |
| financial-validator.test.ts | Code | Pending | ~150 lines |
| MCP integration tests | Code | Pending | ~200 lines per critical tool |
| E2E scenario tests | Code | Pending | ~100 lines |
| Performance optimization | Code | Pending | Caching, lazy loading, pooling |
| ARCHITECTURE.md | Doc | Pending | System design + diagrams |
| TESTING.md | Doc | Pending | Test strategy |
| SECURITY.md | Doc | Pending | Hardening details |
| API.md | Doc | Pending | Agent modes + schemas |
| JSDoc comments | Code | Pending | All exports documented |
| Inline comments | Code | Pending | Complex logic explained |
| Final commits | Git | Pending | With trailers + quality metrics |

---

## Notes for Implementation

1. **Tool Hardening**: Follow pattern from FASE 3
   - Input: sanitize → Rate limit check → Metrics start
   - Execute: run tool
   - Output: error handling → metrics record → return

2. **Financial Validation**: Add before MCP tool calls
   - Reject early if validation fails
   - Log failure in audit trail
   - Return clear error message to user

3. **Testing Strategy**: Test 3 paths per scenario
   - Happy path (normal input → correct output)
   - Error path (invalid input → correct error)
   - Edge path (boundary values, special cases)

4. **Documentation Audience**: Write for thesis defense
   - Explain why each hardening decision was made
   - Show security considerations
   - Demonstrate performance optimization
   - Highlight test coverage

5. **Performance Baseline**: Measure before optimization
   - Establish current latency (likely >500ms)
   - Identify bottlenecks
   - Optimize iteratively, measure each change
   - Document final metrics

---

## Time Estimate

- **Total:** 10-15 hours
- **Phase 1 (Tool Hardening):** 2-3 hours
- **Phase 2 (Financial Validation):** 2-3 hours
- **Phase 3 (Comprehensive Testing):** 3-4 hours
- **Phase 4 (Performance & Docs):** 2-3 hours
- **Phase 5 (Audit & Validation):** 1-2 hours

