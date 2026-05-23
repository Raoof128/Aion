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
if npm run test; then
  echo -e "${GREEN}✓ All tests passed successfully${NC}"
else
  echo -e "${RED}✗ Tests failed.${NC}"
  exit 1
fi

echo -e "\n========================================="
echo -e "${GREEN}✓ All checks passed successfully!${NC}"
echo "========================================="
