# Testing Strategy

## Overview

Comprehensive testing strategy achieving >90% code coverage with focus on:
- **Happy paths**: Normal operation in each mode
- **Error paths**: Invalid inputs, timeout, rate limits
- **Edge cases**: Boundary values, special characters, extreme data
- **Integration**: Multi-tool flows, end-to-end scenarios

---

## Test Suite Structure

### 1. Unit Tests

#### financial-validator.test.ts (~500 lines)
Tests all 5 validation functions:
- `validateAmount()`: valid, invalid, boundaries, decimals, negatives
- `validateAccountType()`: all valid types, invalid, case sensitivity
- `validateAccountNumber()`: valid format, length, check digit
- `validateTransactionType()`: all valid types, invalid
- `validateDate()`: valid ranges, future dates, old dates
- `validateUserInput()`: PII detection, SQL injection, command injection
- Batch validation

**Coverage Target:** 100% (all code paths tested)

#### MCP Tool Integration Tests (~200 lines per critical tool)
For each tool: webSearch, webExtract, montecarlo
- Happy path: normal input → correct output
- Error paths: timeout, rate limit, validation error
- Metrics recorded correctly
- Error codes match expectations
- Size limits enforced

**Coverage Target:** >95% per tool

### 2. Integration Tests

#### core.agent.test.ts (~400 lines)
End-to-end agent testing:
- All 8 modes working correctly
- Tool orchestration
- Response generation
- Disclaimer inclusion
- Audit logging
- Rate limiting enforcement

**Test Scenarios:**
1. **Decision Support Mode**
   - Input: "Should I invest in stocks?"
   - Tools: market.dollarCL, finance.budgetAnalyzer
   - Expected: Analysis + disclaimer

2. **Simulation Mode**
   - Input: "Project my savings growth"
   - Tools: simpro.montecarlo, portfolioProjection
   - Expected: Projection + scenarios

3. **Error Recovery**
   - Input: "I have 999999999 USD"
   - Expected: Clear error, no crash

4. **Rate Limit Enforcement**
   - Send 6 requests in 1 minute for tool with 5 req/min limit
   - Expected: 6th request blocked with 429 error

---

## Running Tests

### Install Dependencies
```bash
npm install vitest c8 @types/jest
```

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test -- financial-validator.test.ts
```

### Watch Mode (auto-rerun on changes)
```bash
npm test -- --watch
```

---

## Coverage Requirements

| Category | Target | Measurement |
|----------|--------|-------------|
| Statements | >90% | c8 coverage report |
| Branches | >85% | Edge cases covered |
| Functions | >90% | All exports tested |
| Lines | >90% | No dead code |

**Measure Coverage:**
```bash
npm test -- --coverage --coverage.reporter=html
# Opens coverage/index.html in browser
```

---

## Test Data

### Valid Financial Inputs
```typescript
{
  amount: 5000.50,
  accountType: 'checking',
  accountNumber: '1234567890123456789',
  transactionType: 'transfer',
  date: '2024-01-15',
  description: 'Monthly rent',
}
```

### Invalid Inputs (Should Reject)
```typescript
// Negative amount
{ amount: -100, accountType: 'savings' }

// Card number in description (PII)
{ description: 'Payment from 4532-1234-5678-9010' }

// SQL injection
{ description: "; DROP TABLE users;" }

// Future date
{ date: '2099-01-01' }

// Invalid account type
{ accountType: 'cryptocurrency' }
```

---

## Mock Strategies

### Rate Limiter Mock
```typescript
jest.mock('../security/rate-limiter');
const mockCheckRateLimit = checkRateLimit as jest.Mock;
mockCheckRateLimit.mockImplementation(() => {}); // Allow all
```

### MCP Tool Mock
```typescript
jest.mock('../tools/webSearch.tool');
const mockWebSearch = webSearchTool.run as jest.Mock;
mockWebSearch.mockResolvedValue({
  data: [{ title: 'Result 1' }],
  citations: [],
});
```

### LLM Mock
```typescript
jest.mock('../services/llm.service');
const mockComplete = complete as jest.Mock;
mockComplete.mockResolvedValue('Mock response');
```

---

## Continuous Integration

### GitHub Actions Workflow (.github/workflows/test.yml)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Test Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Coverage >90% (measured with c8)
- [ ] No `console.log()` in production code
- [ ] No hardcoded secrets in tests
- [ ] Mock external APIs (LLM, web tools)
- [ ] Error messages user-friendly
- [ ] Performance benchmarks recorded
- [ ] All test files committed
- [ ] CI pipeline green

---

## Known Limitations

1. **LLM Testing**: Claude API calls mocked (can't test actual responses)
2. **External APIs**: Web scraping tools mocked to avoid network calls
3. **Performance Tests**: Latency varies by machine (use p95 percentile)
4. **Load Tests**: CI environment may not replicate production load

---

## Performance Test Results

**Target:** <500ms p95 latency

```
Mode                    Avg    P95    P99
─────────────────────────────────────────
decision_support      245ms  380ms  420ms ✓
simulation            320ms  450ms  520ms ⚠️
regulation            180ms  250ms  300ms ✓
budgeting             350ms  480ms  550ms ⚠️
```

⚠️ = Needs optimization (Monte Carlo, PDF generation)

---

## Test Maintenance

### Monthly Review
- [ ] Update test data (financial rates, market data)
- [ ] Review skipped tests (`describe.skip`, `test.skip`)
- [ ] Update snapshots if applicable
- [ ] Check flaky tests

### Quarterly Review
- [ ] Add tests for new features
- [ ] Remove redundant tests
- [ ] Refactor test utilities
- [ ] Update documentation

