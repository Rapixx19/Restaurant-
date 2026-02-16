# VECTERAI Scalability Plan

> Preparing for 10x growth: Modularization, Testing Infrastructure, and Directory Structure

---

## 1. Modularization Strategy

### Current State Assessment
<!-- Update this section once codebase is added -->

| File | Lines | Issue | Recommendation |
|------|-------|-------|----------------|
| `TBD` | - | Monolithic | Split by feature |

### Recommended Splits

#### API Routes
```
# BEFORE (monolithic)
app/api/restaurants/route.ts  (handles GET, POST, PUT, DELETE)

# AFTER (split by operation)
app/api/restaurants/
├── route.ts          # GET (list), POST (create)
├── [id]/
│   └── route.ts      # GET (single), PUT, DELETE
└── [id]/menu/
    └── route.ts      # Menu-specific operations
```

#### Services Layer
```
# BEFORE
services/restaurant-service.ts  (500+ lines)

# AFTER
services/restaurant/
├── index.ts              # Public exports
├── queries.ts            # Database queries
├── mutations.ts          # Create/Update/Delete
├── validators.ts         # Input validation
└── transformers.ts       # Data transformation
```

#### AI Integration
```
# BEFORE
lib/ai/index.ts  (all AI logic)

# AFTER
lib/ai/
├── index.ts              # Public exports
├── providers/
│   ├── openai.ts
│   └── anthropic.ts
├── prompts/
│   ├── menu-analysis.ts
│   └── recommendation.ts
└── utils/
    ├── token-counter.ts
    └── rate-limiter.ts
```

---

## 2. Testing Infrastructure

### Test Sharding Strategy

```yaml
# CI Pipeline Configuration (GitHub Actions)
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: pnpm test --shard=${{ matrix.shard }}/4
```

### Parallelization Approach

| Test Type | Runner | Parallelization |
|-----------|--------|-----------------|
| Unit | Vitest | Per-file parallel |
| Integration | Vitest | Sequential (DB state) |
| E2E | Playwright | 4 workers |
| Security | Custom | Sequential |

### Recommended Test Stack

```json
{
  "devDependencies": {
    "vitest": "^3.x",
    "@testing-library/react": "^16.x",
    "playwright": "^1.x",
    "msw": "^2.x"
  }
}
```

### Test Commands Structure

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:e2e": "playwright test",
    "test:security": "npm audit && snyk test",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=junit"
  }
}
```

---

## 3. Feature-Based Directory Structure

### Proposed Structure

```
src/
├── modules/                    # Feature modules
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignupForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── auth-service.ts
│   │   ├── tests/
│   │   │   ├── LoginForm.test.tsx
│   │   │   └── auth-service.test.ts
│   │   └── index.ts            # Public exports
│   │
│   ├── restaurants/
│   │   ├── components/
│   │   │   ├── RestaurantCard.tsx
│   │   │   └── RestaurantList.tsx
│   │   ├── hooks/
│   │   │   └── useRestaurants.ts
│   │   ├── services/
│   │   │   └── restaurant-service.ts
│   │   ├── tests/
│   │   └── index.ts
│   │
│   ├── menu/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── tests/
│   │   └── index.ts
│   │
│   └── ai-assistant/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── prompts/
│       ├── tests/
│       └── index.ts
│
├── shared/                     # Cross-cutting concerns
│   ├── components/             # Shared UI components
│   ├── hooks/                  # Shared hooks
│   ├── utils/                  # Utility functions
│   └── types/                  # Shared TypeScript types
│
├── infrastructure/             # Technical foundation
│   ├── database/
│   ├── cache/
│   ├── logging/
│   └── monitoring/
│
└── app/                        # Next.js App Router
    ├── (auth)/
    ├── (dashboard)/
    ├── (marketing)/
    └── api/
```

### Module Guidelines

1. **Self-contained**: Each module owns its components, hooks, services, and tests
2. **Clear boundaries**: Modules communicate via explicit exports in `index.ts`
3. **Testable in isolation**: Module tests don't depend on other modules
4. **Zone-aligned**: Each module maps to a single architecture zone

---

## 4. Migration Path

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Vitest + Playwright
- [ ] Configure test sharding in CI
- [ ] Create `shared/` directory structure
- [ ] Establish module template

### Phase 2: Extract Modules (Week 3-4)
- [ ] Extract `auth` module (RED ZONE)
- [ ] Extract `restaurants` module (YELLOW ZONE)
- [ ] Extract `menu` module (YELLOW ZONE)
- [ ] Update import paths

### Phase 3: Testing Coverage (Week 5-6)
- [ ] 100% coverage on RED ZONE modules
- [ ] 80% coverage on YELLOW ZONE modules
- [ ] Snapshot tests for GREEN ZONE

### Phase 4: CI/CD Integration (Week 7)
- [ ] Parallel test execution
- [ ] Coverage gates per zone
- [ ] Automated security scanning

---

## 5. Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Unit test time | TBD | < 30s |
| Integration test time | TBD | < 2min |
| E2E test time | TBD | < 5min |
| Total CI pipeline | TBD | < 10min |

---

## 6. Monitoring & Alerts

```typescript
// Future: Test health monitoring
const testHealthConfig = {
  coverage: {
    red: 100,
    yellow: 80,
    green: 50,
  },
  maxDuration: {
    unit: 30_000,      // 30s
    integration: 120_000, // 2min
    e2e: 300_000,      // 5min
  },
  alerts: {
    slack: '#dev-alerts',
    pagerduty: 'critical-only',
  },
};
```
