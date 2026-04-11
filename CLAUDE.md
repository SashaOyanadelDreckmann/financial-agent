<!-- TESIS:START -->
<!-- VERSION: oh-my-claudecode integrated -->

# Financial Agent - Thesis Project

Multi-phase TypeScript financial agent with MCP-hardened tools and comprehensive testing.

## Operating Principles

- **Modular execution**: Work in discrete phases (FASE 1→2→3)
- **Verification first**: Test before claiming completion
- **Autonomous when ready**: Use `/autopilot` for complex multi-file changes
- **Evidence-based**: Use `/debug` to diagnose state before assuming

## Project Phases

**FASE 1** ✓ Refactor core.agent.ts into 5 modular components
**FASE 2** ✓ Build comprehensive test infrastructure (~2450 LOC)
**FASE 3** ✓ Harden MCP tools with security framework
**FASE 4** → Integration, optimization, thesis writeup

## Available Skills

### Workflows
- `/autopilot "task"` — Autonomous execution (multi-file changes, refactoring)
- `/team` — Coordinate 3+ agents in parallel
- `/deep-interview` — Socratic analysis for requirements
- `/hud` — Real-time metrics dashboard (tests passing, type errors, etc.)

### Utilities
- `/debug` — Diagnose repo state (console logs, network, errors)
- `/mcp-setup` — Configure MCP servers
- `/simplify` — Code review & optimization

## Execution Patterns

**For new features/refactors:**
1. Use `/deep-interview` to clarify requirements
2. Plan with `/team`
3. Execute with `/autopilot`
4. Verify with tests + `/debug`

**For bug fixes:**
1. `/debug` to isolate
2. Fix directly or use `/autopilot`
3. Verify tests pass

**For MCP tool work:**
- Always validate input/output
- Check rate limiting
- Ensure error handling
- Test with `/team` for parallel execution

## State & Memory

- `.claude/projects/*/memory/` — Project context
- `MEMORY.md` — Persistent facts across sessions
- `.claude/plans/` — Session plans

## Testing

Run before commit:
```bash
npm test
npm run build
```

## Commit Protocol

Use conventional commits with trailers:
```
feat(core-agent): Add new validation layer

Validation ensures all financial inputs meet schema requirements.

Scope-risk: moderate
Confidence: high
Constraint: Must not break existing test suite
```

Key trailers: `Constraint:`, `Rejected:`, `Directive:`, `Confidence:`, `Scope-risk:`

## Quick Commands

- `setup omc` — Initialize OMC for this project
- `/autopilot "fix typing errors"` — Autonomous work
- `/hud` — Show status
- `/debug` — Diagnose issues

<!-- TESIS:END -->
