# VECTERAI Architecture Zones

> Risk-based classification system for automated quality gates

## Zone Overview

| Zone | Risk Level | AI Edit Policy | Required Tests |
|------|------------|----------------|----------------|
| GREEN | Low | AI edits freely | Snapshots, render tests |
| YELLOW | Medium | AI edits require review | 100% branch coverage, integration |
| RED | Critical | Human-in-the-loop mandatory | E2E, security audit, DB tests |

---

## GREEN ZONE (High Velocity / Low Risk)

**Policy:** AI can edit freely. Fast iteration allowed.

**Test Requirements:**
- Snapshot tests
- Basic render tests
- Visual regression (optional)

### Directories
```
components/ui/          # Reusable UI primitives
components/landing/     # Marketing/landing pages
styles/                 # CSS/Tailwind configurations
public/                 # Static assets
app/(marketing)/        # Public-facing pages
```

### Example Files
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`
- `components/landing/Hero.tsx`
- `styles/globals.css`

---

## YELLOW ZONE (Medium Risk)

**Policy:** AI edits require code review before merge.

**Test Requirements:**
- 100% branch coverage
- Strict TypeScript (no `any`)
- Integration tests with mocks
- API contract tests

### Directories
```
lib/ai/                 # AI/LLM integration logic
hooks/                  # Custom React hooks
api/                    # API route handlers
services/               # Business logic services
utils/                  # Utility functions
stores/                 # State management (Zustand/Redux)
```

### Example Files
- `lib/ai/openai-client.ts`
- `hooks/useRestaurantData.ts`
- `api/restaurants/route.ts`
- `services/menu-service.ts`

---

## RED ZONE (Critical / High Risk)

**Policy:** Human-in-the-loop MANDATORY. No autonomous AI edits.

**Test Requirements:**
- Heavy integration/E2E testing
- Security auditing (OWASP)
- Containerized database tests
- Penetration testing for auth flows
- Audit logging verification

### Directories
```
middleware/             # Auth middleware, request validation
lib/auth/               # Authentication logic
lib/supabase/admin/     # Supabase admin operations
supabase/migrations/    # Database schema & RLS policies
app/api/webhook/        # External webhooks (Stripe, etc.)
app/api/auth/           # Auth endpoints
config/rbac/            # Role-based access control
```

### Example Files
- `middleware.ts`
- `lib/auth/session.ts`
- `lib/supabase/admin/users.ts`
- `app/api/webhook/stripe/route.ts`
- `app/api/auth/[...nextauth]/route.ts`

---

## Zone Detection Patterns

Used by `scripts/smart-test.sh`:

```bash
# RED ZONE patterns
middleware|auth|webhook|supabase/admin|supabase/migrations

# YELLOW ZONE patterns
lib/ai|api/|hooks/

# GREEN ZONE
Everything else (default)
```

---

## Adding New Files

When creating new files, determine zone by asking:

1. **Does it handle user credentials, payments, or permissions?** → RED
2. **Does it contain business logic or external API calls?** → YELLOW
3. **Is it purely presentational?** → GREEN

---

## Escalation Rules

- GREEN → YELLOW: When component gains business logic
- YELLOW → RED: When service handles auth/payments
- Any zone can be manually escalated via PR review
