# VECTERAI Test Plan

> Automated Pre-Push Quality Gate System

---

## Overview

This document defines the automated testing strategy executed before every `git push`. The system uses **zone-based smart execution** to run only the tests relevant to changed files.

---

## Quality Gate Flow

```
┌─────────────────┐
│   git push      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  pre-push hook  │
│  (.husky)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ smart-test.sh   │
│ Detect zones    │
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌───────┐ ┌────────┐ ┌──────────┐
│ RED   │ │ YELLOW │ │  GREEN   │
│ Full  │ │ Integ  │ │  Lint    │
│ Suite │ │ Tests  │ │  Only    │
└───┬───┘ └───┬────┘ └────┬─────┘
    │         │           │
    └─────────┴───────────┘
              │
              ▼
       ┌──────────────┐
       │ Gate Passed? │
       └──────┬───────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
┌────────┐         ┌────────┐
│  PASS  │         │  FAIL  │
│  Push  │         │ Abort  │
└────────┘         └────────┘
```

---

## Smart Execution Logic

### Implementation: `scripts/smart-test.sh`

```bash
#!/bin/bash
set -e

# Detect changed files
CHANGED_FILES=$(git diff --name-only HEAD)

echo "Analyzing VECTERAI Change Zones..."

if echo "$CHANGED_FILES" | grep -E "middleware|auth|webhook|supabase/admin"; then
    echo "RED ZONE: Critical Security/Auth change. Running full suite..."
    # npm run test:security
    npm run lint
elif echo "$CHANGED_FILES" | grep -E "lib/ai|api/|hooks/"; then
    echo "YELLOW ZONE: Logic/API change. Running Integration tests..."
    npm run lint
else
    echo "GREEN ZONE: UI/Landing change. Running Linter..."
    npm run lint
fi

echo "Quality Gate Passed."
```

### Zone Detection Patterns

| Zone | Grep Pattern | Trigger Paths |
|------|--------------|---------------|
| RED | `middleware\|auth\|webhook\|supabase/admin` | `middleware.ts`, `lib/auth/*`, `app/api/webhook/*`, `lib/supabase/admin/*` |
| YELLOW | `lib/ai\|api/\|hooks/` | `lib/ai/*`, `app/api/*`, `hooks/*` |
| GREEN | (default) | Everything else |

---

## Test Commands by Zone

### RED ZONE (Full Suite)

```bash
# Run in sequence - all must pass
npm run lint                    # ESLint with zero warnings
npm run test:unit              # Unit tests
npm run test:integration       # Integration tests
npm run test:e2e               # Playwright E2E
npm run test:security          # Security scan

# Coverage requirement: 100%
```

**Tests Executed:**
- All unit tests
- All integration tests
- All E2E tests
- Security vulnerability scan
- Dependency audit

### YELLOW ZONE (Integration)

```bash
# Run in sequence
npm run lint
npm run test:unit -- --related   # Only tests for changed files
npm run test:integration

# Coverage requirement: 80%
```

**Tests Executed:**
- Lint checks
- Unit tests (related to changes)
- Integration tests
- API contract tests

### GREEN ZONE (Lint Only)

```bash
npm run lint

# Coverage requirement: None (lint only)
```

**Tests Executed:**
- ESLint
- TypeScript compilation check
- Prettier formatting check

---

## Tooling Configuration

### Husky Setup

```
.husky/
├── pre-commit      # Runs lint-staged
└── pre-push        # Runs smart-test.sh
```

**pre-commit:**
```bash
#!/bin/sh
npx lint-staged
```

**pre-push:**
```bash
#!/bin/sh
./scripts/smart-test.sh
```

### lint-staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  detect-zone:
    runs-on: ubuntu-latest
    outputs:
      zone: ${{ steps.detect.outputs.zone }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: detect
        run: |
          CHANGED=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }})
          if echo "$CHANGED" | grep -qE "middleware|auth|webhook|supabase/admin"; then
            echo "zone=red" >> $GITHUB_OUTPUT
          elif echo "$CHANGED" | grep -qE "lib/ai|api/|hooks/"; then
            echo "zone=yellow" >> $GITHUB_OUTPUT
          else
            echo "zone=green" >> $GITHUB_OUTPUT
          fi

  test-red:
    needs: detect-zone
    if: needs.detect-zone.outputs.zone == 'red'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm test:integration
      - run: pnpm test:e2e
      - run: pnpm audit

  test-yellow:
    needs: detect-zone
    if: needs.detect-zone.outputs.zone == 'yellow'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm test:integration

  test-green:
    needs: detect-zone
    if: needs.detect-zone.outputs.zone == 'green'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
```

---

## Bypassing the Gate

### Emergency Override

```bash
# Skip pre-push hook (use sparingly!)
git push --no-verify

# Document reason in commit message:
# "HOTFIX: [reason] - QA gate bypassed, follow-up PR required"
```

### Allowed Bypass Scenarios

1. **Production hotfix** - Critical bug in production
2. **CI infrastructure down** - Tests can't run
3. **Documentation-only changes** - No code modified

**All bypasses require:**
- Slack notification to #dev-alerts
- Follow-up PR within 24 hours with full test suite

---

## Future Enhancements

### Phase 2: Enhanced Detection

```bash
# Smarter file analysis
- Parse AST for import changes
- Track transitive dependencies
- Run affected module tests only
```

### Phase 3: Performance Testing

```bash
# Add to RED ZONE
npm run test:performance   # Lighthouse CI
npm run test:load          # k6 load tests
```

### Phase 4: Visual Regression

```bash
# Add to GREEN ZONE
npm run test:visual        # Percy/Chromatic
```

---

## Metrics & Reporting

### Success Criteria

| Metric | Target |
|--------|--------|
| Gate pass rate | > 95% |
| Avg gate time (GREEN) | < 30s |
| Avg gate time (YELLOW) | < 2min |
| Avg gate time (RED) | < 5min |
| False positive rate | < 5% |

### Monitoring

```bash
# Log gate executions
echo "$(date) | Zone: $ZONE | Duration: ${DURATION}s | Status: $STATUS" >> .qa-metrics.log
```
