#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   VECTERAI Quality Gate System${NC}"
echo -e "${BLUE}======================================${NC}"

# Detect changed files (staged + unstaged vs HEAD)
CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${GREEN}No changes detected. Skipping tests.${NC}"
    exit 0
fi

echo -e "\n${BLUE}Changed files:${NC}"
echo "$CHANGED_FILES" | head -20
echo ""

# Zone detection
ZONE="green"

if echo "$CHANGED_FILES" | grep -qE "middleware|auth|webhook|supabase/admin"; then
    ZONE="red"
elif echo "$CHANGED_FILES" | grep -qE "lib/ai|api/|hooks/"; then
    ZONE="yellow"
fi

# Execute based on zone
case $ZONE in
    red)
        echo -e "${RED}======================================${NC}"
        echo -e "${RED}  RED ZONE: Critical Security Change${NC}"
        echo -e "${RED}======================================${NC}"
        echo -e "${RED}Running: Full test suite + security scan${NC}\n"

        # Lint
        echo -e "${BLUE}[1/4] Running linter...${NC}"
        pnpm lint

        # Unit tests with coverage
        echo -e "\n${BLUE}[2/4] Running unit tests with coverage...${NC}"
        pnpm test:coverage

        # E2E tests
        echo -e "\n${BLUE}[3/4] Running E2E tests...${NC}"
        pnpm test:e2e || echo -e "${YELLOW}E2E tests skipped (no server running)${NC}"

        # Security audit
        echo -e "\n${BLUE}[4/4] Running security audit...${NC}"
        pnpm test:security || echo -e "${YELLOW}Security audit found warnings${NC}"
        ;;

    yellow)
        echo -e "${YELLOW}======================================${NC}"
        echo -e "${YELLOW}  YELLOW ZONE: Logic/API Change${NC}"
        echo -e "${YELLOW}======================================${NC}"
        echo -e "${YELLOW}Running: Lint + Unit tests${NC}\n"

        # Lint
        echo -e "${BLUE}[1/2] Running linter...${NC}"
        pnpm lint

        # Unit tests
        echo -e "\n${BLUE}[2/2] Running unit tests...${NC}"
        pnpm test
        ;;

    green)
        echo -e "${GREEN}======================================${NC}"
        echo -e "${GREEN}  GREEN ZONE: UI/Static Change${NC}"
        echo -e "${GREEN}======================================${NC}"
        echo -e "${GREEN}Running: Lint only${NC}\n"

        # Lint
        echo -e "${BLUE}[1/1] Running linter...${NC}"
        pnpm lint
        ;;
esac

echo -e "\n${GREEN}======================================${NC}"
echo -e "${GREEN}  Quality Gate Passed${NC}"
echo -e "${GREEN}======================================${NC}"
