#!/bin/bash
# Aion Project Quality Check Script

# Exit immediately if a command exits with a non-zero status
set -e

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================="
echo "Running Aion Project Quality Gate Checks"
echo "========================================="

echo -e "\n1. Running Prettier format check..."
if npm run format:check; then
  echo -e "${GREEN}✓ Formatting is correct${NC}"
else
  echo -e "${RED}✗ Formatting check failed. Run 'npm run format' to fix.${NC}"
  exit 1
fi

echo -e "\n2. Running ESLint linter..."
if npm run lint; then
  echo -e "${GREEN}✓ Linting checks passed${NC}"
else
  echo -e "${RED}✗ Linting check failed. Run 'npm run lint:fix' or fix manually.${NC}"
  exit 1
fi

echo -e "\n3. Running TypeScript compiler type check..."
if npm run type-check; then
  echo -e "${GREEN}✓ Type checking passed${NC}"
else
  echo -e "${RED}✗ Type checking failed.${NC}"
  exit 1
fi

echo -e "\n4. Running Unit & Integration Tests..."
TMPFILE=$(mktemp)
npm run test 2>&1 | tee "$TMPFILE"
TEST_EXIT=${PIPESTATUS[0]}
PASS_COUNT=$(grep "^# pass " "$TMPFILE" | awk '{print $3}')
FAIL_COUNT=$(grep "^# fail " "$TMPFILE" | awk '{print $3}')
rm -f "$TMPFILE"
if [ "$TEST_EXIT" -eq 0 ]; then
  echo -e "${GREEN}✓ All ${PASS_COUNT} tests passed successfully${NC}"
else
  echo -e "${RED}✗ ${FAIL_COUNT:-some} test(s) failed.${NC}"
  exit 1
fi

echo -e "\n========================================="
echo -e "${GREEN}✓ All checks passed — format ✓  lint ✓  types ✓  ${PASS_COUNT} tests ✓${NC}"
echo "========================================="
