# FASE 4 Implementation Plan

**Status:** Planning Phase Complete
**Target Completion:** ~10-15 hours
**Quality Gate:** >90% test coverage, <500ms latency, security audit passing

---

## Phase 1: Complete MCP Tool Hardening (2-3 hours)

### Task 1.1: Harden scrapeDo.tool.ts
```
Work:
- Add AbortController timeout (10s)
- Response size limit (5MB)
- Retry logic (exponential backoff, max 3 retries)
- Rate limiting check (5 req/min)
- Metrics collector wrapper
- Error handling (standardized ToolError)

Test:
- Happy path: normal scrape
- Error: timeout after 10s
- Error: response >5MB
- Rate limit: block on 6th request in 1 min
```

### Task 1.2: Harden calculateor.tool.ts
```
Work:
- Numeric input validation (bounds checking)
- Metrics collection
- Error handling wrapper

Test:
- Valid calculation
- Invalid input
- Boundary values
```

### Task 1.3: Harden today.tool.ts
```
Work:
- Metrics collection
- Simple wrapper

Test:
- Returns current date
- Metrics recorded
```

### Task 1.4: Harden PDF generation tools
```
Work:
- generateNarrativePdf.tool.ts:
  - Timeout: 30s
  - Output size: 10MB max
  - Memory cleanup after generation
  - Telemetry
  - Error handling

- generateSimulationPdf.tool.ts:
  - Same as above

Test:
- PDF generation succeeds
- Timeout after 30s
- Output >10MB rejected
- Memory cleaned after generation
```

**Deliverable:** All 22 tools hardened + tested
**Validation:** npm test passes, no type errors

---

## Phase 2: Financial Input Validation (2-3 hours)

### Task 2.1: Create financial-validator.ts
```
Functions (each ~30-40 lines):
1. validateAmount(value, min, max, currency?)
   - Positive number check
   - Max 999,999,999 limit
   - 2 decimal places max
   - Currency validation if provided

2. validateAccountType(type)
   - Whitelist: 'savings', 'checking', 'investment', 'loan', 'credit_card'
   - Case-insensitive
   - Reject unknown types

3. validateAccountNumber(number)
   - Chilean RBAN format (18-22 digits)
   - Pattern validation
   - Check digit verification

4. validateTransactionType(type)
   - Whitelist: 'deposit', 'withdrawal', 'transfer', 'payment', 'investment'
   - Reject unknown

5. validateDate(date)
   - Not in future
   - Not >10 years past
   - Valid date format

Helper:
- validateUserInput(text, mode)
  - Max 2000 chars
  - No SQL injection patterns
  - No financial PII (card numbers, SSN)
  - No command injection

Test:
- Valid inputs pass
- Invalid inputs rejected with clear errors
- Boundary values handled
- PII detection working
```

### Task 2.2: Integrate into core.agent.ts
```
- Call validators before tool execution
- Return early on validation failure
- Log validation failures in audit trail
- Example:
  const { valid, reason } = validateAmount(userInput);
  if (!valid) {
    logAudit({ ... error });
    return { error: reason };
  }
```

**Deliverable:** validators/ directory with financial-validator.ts
**Validation:** Unit tests passing, integration with core.agent verified

---

## Phase 3: Comprehensive Testing (3-4 hours)

### Task 3.1: Update core.agent.test.ts (~300 lines)
```
Test Coverage:
1. Happy paths (8 modes)
   - decision_support mode
   - simulation mode
   - regulation mode
   - information mode
   - education mode
   - comparison mode
   - budgeting mode
   - planification mode
   - containment mode

2. Error paths
   - Invalid input (empty, >2000 chars)
   - Network failure (tool timeout)
   - MCP tool error
   - Rate limit exceeded
   - Financial validation failure

3. Edge cases
   - Zero amounts
   - Boundary amounts (999,999,999)
   - Special characters in text
   - Very long inputs (>2000 chars)
   - Malformed financial data

4. Financial validation
   - Reject negative amounts
   - Reject unknown account types
   - Reject invalid account numbers
   - Reject invalid transaction types
   - Reject future dates

5. Disclaimer generation
   - Each mode has correct disclaimer
   - All 8 disclaimers in DISCLAIMERS_BY_MODE

6. Audit logging
   - Entry created per request
   - Fields populated correctly
   - Errors logged
   - Latency recorded

7. Rate limiting
   - Allow up to limit per user
   - Block on excess
   - Reset correctly
```

### Task 3.2: Create financial-validator.test.ts (~150 lines)
```
Test Coverage:
1. validateAmount()
   - Valid: 100, 1000.50, 999999999
   - Invalid: -100, 1000.999 (3 decimals), 1000000000 (too large)
   - Currency validation

2. validateAccountType()
   - Valid: 'savings', 'checking', 'investment', 'loan', 'credit_card'
   - Invalid: 'unknown', 'cash', ''
   - Case insensitive

3. validateAccountNumber()
   - Valid Chilean RBAN
   - Invalid: too short, too long, non-numeric
   - Check digit validation

4. validateTransactionType()
   - Valid: all 5 types
   - Invalid: unknown types

5. validateDate()
   - Valid: today, past dates
   - Invalid: future date, >10 years past

6. validateUserInput()
   - PII detection: card numbers, SSN patterns
   - SQL injection patterns
   - Command injection patterns
   - Oversized input
```

### Task 3.3: Add MCP tool integration tests
```
For each critical tool (webSearch, webExtract, montecarlo, etc):
- ~50-100 lines per tool
- Happy path
- Error handling (timeout, rate limit, validation)
- Metrics recorded
- Integration with core.agent verified
```

### Task 3.4: Add end-to-end scenario tests (~100 lines)
```
Scenarios:
1. Complete planning flow
   - User asks question
   - Agent analyzes
   - Calls 2-3 tools
   - Generates response
   - Audit logged

2. Financial analysis + planning
   - Budget analysis tool
   - Debt analysis tool
   - Goal planning tool
   - All in one flow

3. Error recovery
   - Tool fails
   - Agent falls back
   - Still returns response
```

### Task 3.5: Measure coverage
```
- Run: npm test -- --coverage
- Goal: >90% coverage
- Report: c8 HTML report
- Fix gaps if needed
```

**Deliverable:** All test files updated/created, >90% coverage achieved
**Validation:** npm test passes, coverage report shows >90%

---

## Phase 4: Performance & Documentation (2-3 hours)

### Task 4.1: Performance profiling & optimization
```
1. Baseline measurement
   - npm test (measure total time)
   - Profile: Node.js profiler
   - Identify slow tests/functions

2. Optimization candidates
   - Cache LLM system prompts
   - Lazy-load large dependencies
   - Batch MCP calls where possible
   - Memory pooling for telemetry

3. Measure improvements
   - Run npm test again
   - Compare latency
   - Verify p95 < 500ms goal

4. Document metrics
   - Baseline vs final latency
   - Memory usage
   - CPU usage under load
```

### Task 4.2: Create ARCHITECTURE.md
```
Sections:
- System overview (diagram)
- Component responsibility
- Data flow (input → validation → tools → response)
- Error handling flow
- Security hardening points
- Performance characteristics
```

### Task 4.3: Create TESTING.md
```
Sections:
- Test strategy (happy/error/edge paths)
- Coverage targets
- How to run tests
- Coverage report location
- Continuous integration setup
```

### Task 4.4: Create SECURITY.md
```
Sections:
- Security hardening summary
- ReDoS protection details
- SSRF prevention details
- Rate limiting strategy
- Input sanitization approach
- Audit logging (CMF compliance)
- Vulnerability checklist
```

### Task 4.5: Create API.md
```
Sections:
- Agent modes (8 modes documented)
  - Use case
  - Appropriate inputs
  - Typical outputs
- Input schema examples
- Output structure
- Error codes & meanings
- Example flows
```

### Task 4.6: Add JSDoc comments
```
For all exports in:
- core.agent.ts
- financial-validator.ts
- All tool integration files

Format:
/**
 * Description of what this does
 * @param param1 - Description
 * @returns Description of return value
 * @example
 * const result = fn(param);
 */
```

### Task 4.7: Add inline comments
```
For complex logic:
- Financial calculations
- MCP tool orchestration
- Error handling strategies
- Performance optimizations
- Security checks
```

**Deliverable:** Performance optimized, 4 documentation files, full JSDoc + inline comments
**Validation:** p95 latency <500ms, documentation completeness checked

---

## Phase 5: Security Audit & Final Validation (1-2 hours)

### Task 5.1: Security checklist
```
[ ] All 22 MCP tools hardened
[ ] ReDoS protection working
[ ] SSRF prevention working
[ ] Rate limiting enforced
[ ] Input validation comprehensive
[ ] Financial PII not exposed
[ ] Error messages safe
[ ] Audit log comprehensive
```

### Task 5.2: Functional validation
```
[ ] All 8 agent modes working
[ ] No crashes on invalid input
[ ] Clear error messages
[ ] Disclaimers showing
[ ] Audit logs generated
```

### Task 5.3: Performance validation
```
[ ] Tests run <10 seconds total
[ ] p95 latency <500ms (measured)
[ ] Memory usage bounded
[ ] No leaks detected
```

### Task 5.4: Code quality check
```
[ ] npm run build (TypeScript compilation)
[ ] No type errors
[ ] No any types without escape hatches
[ ] No console.warn/error in prod code
[ ] Formatting consistent
```

### Task 5.5: Final commits
```
Commits with trailers:
1. "feat(tools): Complete hardening of final 4 MCP tools"
   - scrapeDo, calculateor, today, PDF tools

2. "feat(validation): Add comprehensive financial input validation"
   - 5 validator functions
   - Integration with core agent

3. "test(core): Add >90% coverage test suite"
   - core.agent tests
   - validator tests
   - integration tests
   - e2e scenarios

4. "perf(agent): Optimize latency to <500ms p95"
   - Caching
   - Lazy loading
   - Profiling results documented

5. "docs(project): Create comprehensive documentation"
   - ARCHITECTURE.md
   - TESTING.md
   - SECURITY.md
   - API.md
   - JSDoc + inline comments

6. "chore(thesis): Final validation & security audit"
   - Security checklist
   - Performance validation
   - Code quality verification
   - Ready for defense
```

**Deliverable:** All security checks passed, code ready for defense
**Validation:** npm test, npm run build, security checklist all green

---

## Success Criteria Validation Matrix

| Criterion | Status | Evidence |
|---|---|---|
| All 22 tools hardened | ⏳ | npm test passes, tool integration verified |
| 100% financial validation | ⏳ | financial-validator.test.ts passing |
| >90% test coverage | ⏳ | c8 coverage report shows >90% |
| <500ms p95 latency | ⏳ | Performance measurement documented |
| Zero console.warn/error | ⏳ | npm test output clean |
| Type safety (no any) | ⏳ | tsc --noEmit passes |
| Documentation complete | ⏳ | 4 doc files created, JSDoc complete |
| Security audit passing | ⏳ | Checklist all checked |
| Thesis-ready quality | ⏳ | Code review passed, defense ready |

---

## Risk Mitigation

**Risk:** Latency optimization doesn't reach <500ms
- Mitigation: Profile early, identify bottlenecks, prioritize high-impact optimizations
- Fallback: Document reasons for latency, set realistic p95 target

**Risk:** Test coverage doesn't reach 90%
- Mitigation: Test iteratively, identify gaps early
- Fallback: Document coverage report, explain gaps, prioritize critical paths

**Risk:** MCP tool hardening incomplete
- Mitigation: Batch remaining 4 tools, test in parallel
- Fallback: Complete most critical tools, document remaining work

---

## Implementation Order

1. **Complete tool hardening first** (enables testing later)
2. **Add financial validation** (needed for correct tests)
3. **Write tests** (validates everything works)
4. **Optimize performance** (after tests confirm correctness)
5. **Document & audit** (final polish for defense)

---

## Ready for Phase 2: Execution

All requirements specified. Ready to implement.

