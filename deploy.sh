#!/bin/bash
# Deploy script - pushes to both origin (GitHub) and kamke remotes

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Deploying to all remotes...${NC}"
echo ""

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "Current branch: ${GREEN}$BRANCH${NC}"
echo ""

# Push to origin (GitHub)
echo -e "${YELLOW}Pushing to origin (GitHub)...${NC}"
if git push origin "$BRANCH"; then
    echo -e "${GREEN}✓ Origin push successful${NC}"
else
    echo -e "${RED}✗ Origin push failed${NC}"
    exit 1
fi
echo ""

# Push to kamke
echo -e "${YELLOW}Pushing to kamke...${NC}"
if git push kamke "$BRANCH"; then
    echo -e "${GREEN}✓ Kamke push successful${NC}"
else
    echo -e "${RED}✗ Kamke push failed${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}🎉 Deploy complete! Pushed to all remotes.${NC}"
