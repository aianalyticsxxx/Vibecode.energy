#!/bin/bash

# VibeCode Database Setup Script
# This script sets up the development database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/infra/docker"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VibeCode Database Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Parse arguments
SEED=false
RESET=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --seed) SEED=true ;;
        --reset) RESET=true ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --seed    Run seed data after migrations"
            echo "  --reset   Reset database (drop and recreate)"
            echo "  -h, --help Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker-compose or docker is not installed${NC}"
    exit 1
fi

# Determine docker compose command
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Start services
echo -e "${YELLOW}Starting Docker services...${NC}"
cd "$DOCKER_DIR"
$DOCKER_COMPOSE up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while ! docker exec vibecode-postgres pg_isready -U vibecode -d vibecode > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}Error: PostgreSQL did not become ready in time${NC}"
        exit 1
    fi
    echo "  Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"
echo ""

# Reset database if requested
if [ "$RESET" = true ]; then
    echo -e "${YELLOW}Resetting database...${NC}"
    docker exec vibecode-postgres psql -U vibecode -d postgres -c "DROP DATABASE IF EXISTS vibecode;"
    docker exec vibecode-postgres psql -U vibecode -d postgres -c "CREATE DATABASE vibecode;"
    echo -e "${GREEN}Database reset complete!${NC}"
    echo ""
fi

# Run migrations
echo -e "${YELLOW}Running migrations...${NC}"
cd "$ROOT_DIR"

# Check if we're in a Node.js project with the migration script
if [ -f "apps/api/package.json" ]; then
    cd apps/api

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi

    # Run migrations using ts-node or tsx
    if command -v npx &> /dev/null; then
        npx tsx src/db/migrate.ts
    else
        echo -e "${RED}Error: npx is not available${NC}"
        exit 1
    fi

    cd "$ROOT_DIR"
else
    echo -e "${YELLOW}Note: Run migrations manually from apps/api directory${NC}"
fi

echo ""

# Run seeds if requested
if [ "$SEED" = true ]; then
    echo -e "${YELLOW}Running seed data...${NC}"
    cd "$ROOT_DIR"

    if [ -f "apps/api/package.json" ]; then
        cd apps/api

        if command -v npx &> /dev/null; then
            npx tsx src/db/seed.ts
        else
            echo -e "${RED}Error: npx is not available${NC}"
            exit 1
        fi

        cd "$ROOT_DIR"
    else
        echo -e "${YELLOW}Note: Run seeds manually from apps/api directory${NC}"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "PostgreSQL: ${GREEN}localhost:5432${NC}"
echo -e "MinIO API:  ${GREEN}localhost:9000${NC}"
echo -e "MinIO Console: ${GREEN}localhost:9001${NC}"
echo ""
echo -e "Database credentials:"
echo -e "  User:     ${YELLOW}vibecode${NC}"
echo -e "  Password: ${YELLOW}vibecode${NC}"
echo -e "  Database: ${YELLOW}vibecode${NC}"
echo ""
echo -e "MinIO credentials:"
echo -e "  User:     ${YELLOW}vibecode${NC}"
echo -e "  Password: ${YELLOW}vibecode123${NC}"
echo ""
echo -e "To stop services: ${YELLOW}cd $DOCKER_DIR && $DOCKER_COMPOSE down${NC}"
echo ""
