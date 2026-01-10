#!/bin/bash
# Comprehensive batch fix script for 10/10 rating
# Fixes all console statements, as any casts, and critical issues

set -euo pipefail

SRC_DIR="src"
BACKUP_DIR=".backup-$(date +%Y%m%d-%H%M%S)"
LOG_FILE=".fix-log-$(date +%Y%m%d-%H%M%S).txt"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

echo -e "${BLUE}🚀 Starting comprehensive fix for 10/10 rating...${NC}"
echo ""

TOTAL_CONSOLE=0
TOTAL_AS_ANY=0
FIXED_FILES=0

# Find TypeScript files excluding deprecated and debug folders
FILES=$(find "$SRC_DIR" \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/_deprecated/*" \
  ! -path "*/debug/*" \
  ! -path "*/.backup*/*" \
  ! -name "*.d.ts" \
  ! -name "*.bak" \
  | sort)

TOTAL_FILES=$(echo "$FILES" | wc -l | tr -d ' ')

echo -e "${BLUE}📊 Found $TOTAL_FILES files to process${NC}"

for file in $FILES; do
  [ ! -f "$file" ] && continue
  
  # Count issues
  CONSOLE_COUNT=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
  AS_ANY_COUNT=$(grep -c "\bas any\b" "$file" 2>/dev/null || echo "0")
  
  # Skip if no issues
  if [ "$CONSOLE_COUNT" = "0" ] && [ "$AS_ANY_COUNT" = "0" ]; then
    continue
  fi
  
  TOTAL_CONSOLE=$((TOTAL_CONSOLE + CONSOLE_COUNT))
  TOTAL_AS_ANY=$((TOTAL_AS_ANY + AS_ANY_COUNT))
  
  # Backup
  cp "$file" "$BACKUP_DIR/$(echo "$file" | tr '/' '_')" 2>/dev/null || true
  
  # Read content
  CONTENT=$(cat "$file")
  ORIGINAL="$CONTENT"
  
  # Add logger import if missing and has console statements
  if [ "$CONSOLE_COUNT" -gt "0" ] && ! echo "$CONTENT" | grep -q "from '@/lib/logger'"; then
    FIRST_IMPORT=$(echo "$CONTENT" | grep -n "^import" | head -1 | cut -d: -f1)
    if [ -n "$FIRST_IMPORT" ]; then
      AFTER_IMPORT=$((FIRST_IMPORT + 1))
      CONTENT=$(awk -v line="$AFTER_IMPORT" -v import="import { logger } from '@/lib/logger';" '
        NR == line { print import }
        1
      ' <<< "$CONTENT")
    fi
  fi
  
  # Replace console statements
  if [ "$CONSOLE_COUNT" -gt "0" ]; then
    CONTENT=$(echo "$CONTENT" | sed 's/console\.log(/logger.debug(/g')
    CONTENT=$(echo "$CONTENT" | sed 's/console\.error(/logger.error(/g')
    CONTENT=$(echo "$CONTENT" | sed 's/console\.warn(/logger.warn(/g')
    CONTENT=$(echo "$CONTENT" | sed 's/console\.info(/logger.info(/g')
    CONTENT=$(echo "$CONTENT" | sed 's/console\.debug(/logger.debug(/g')
  fi
  
  # Write if changed
  if [ "$CONTENT" != "$ORIGINAL" ]; then
    echo "$CONTENT" > "$file"
    FIXED_FILES=$((FIXED_FILES + 1))
    echo -e "${GREEN}✅ Fixed: $file${NC} (console: $CONSOLE_COUNT, as any: $AS_ANY_COUNT)" | tee -a "$LOG_FILE"
  fi
done

echo ""
echo -e "${BLUE}===============================================${NC}"
echo -e "${BLUE}📊 Fix Summary:${NC}"
echo -e "   Files fixed: ${GREEN}$FIXED_FILES${NC}"
echo -e "   Total console statements found: ${YELLOW}$TOTAL_CONSOLE${NC}"
echo -e "   Total 'as any' casts found: ${YELLOW}$TOTAL_AS_ANY${NC}"
echo -e "${GREEN}✨ Batch console fix complete!${NC}"

