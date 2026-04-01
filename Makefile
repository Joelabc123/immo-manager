# =============================================================================
# Makefile - Development Control Center
# Immo Manager
# =============================================================================
#
# This Makefile orchestrates the development workflow.
# Docker is used for infrastructure (Postgres).
# Application code runs on the host machine with hot-reload.
# =============================================================================

.PHONY: help install dev up down logs db-generate db-push db-migrate db-studio db-reset clean type-check lint lint-fix format format-check check build prod-up prod-down prod-logs prod-ps prod-restart prod-reset setup

# Default shell
SHELL := /bin/zsh

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# =============================================================================
# HELP
# =============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(CYAN)Immo Manager - Development Control Center$(NC)"
	@echo "$(CYAN)===========================================$(NC)"
	@echo ""
	@echo "$(YELLOW)Available commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# INSTALLATION
# =============================================================================

install: ## Install all dependencies
	@echo "$(CYAN)Installing dependencies...$(NC)"
	pnpm install
	@echo "$(GREEN)Dependencies installed$(NC)"

# =============================================================================
# INFRASTRUCTURE (Docker)
# =============================================================================

up: ## Start infrastructure (Postgres) in Docker
	@echo "$(CYAN)Starting infrastructure services...$(NC)"
	docker compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Infrastructure started$(NC)"
	@echo ""
	@echo "  PostgreSQL: localhost:5432"
	@echo ""

down: ## Stop infrastructure
	@echo "$(CYAN)Stopping infrastructure services...$(NC)"
	docker compose -f docker-compose.dev.yml down
	@echo "$(GREEN)Infrastructure stopped$(NC)"

logs: ## Show infrastructure logs
	docker compose -f docker-compose.dev.yml logs -f

# =============================================================================
# DEVELOPMENT
# =============================================================================

dev: up ## Start development (infrastructure + Next.js with hot-reload)
	@if [ ! -f .env ]; then \
		echo "$(RED)ERROR: No .env file found. Run: make setup$(NC)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Starting development server...$(NC)"
	@echo ""
	@echo "$(YELLOW)NOTE: App runs on host machine with hot-reload$(NC)"
	@echo ""
	pnpm dev

# =============================================================================
# DATABASE
# =============================================================================

db-generate: ## Generate Drizzle migrations from schema changes
	@echo "$(CYAN)Generating migrations...$(NC)"
	pnpm db:generate
	@echo "$(GREEN)Migrations generated$(NC)"

db-push: ## Push schema changes directly to database (dev only)
	@echo "$(CYAN)Pushing schema to database...$(NC)"
	pnpm db:push
	@echo "$(GREEN)Schema pushed$(NC)"

db-migrate: ## Run pending migrations
	@echo "$(CYAN)Running migrations...$(NC)"
	pnpm db:migrate
	@echo "$(GREEN)Migrations complete$(NC)"

db-studio: ## Open Drizzle Studio (database GUI)
	@echo "$(CYAN)Opening Drizzle Studio...$(NC)"
	@echo "   Visit: https://local.drizzle.studio"
	pnpm db:studio

db-reset: down ## Reset database (WARNING: destroys all data)
	@echo "$(RED)Resetting database...$(NC)"
	docker volume rm immo-manager_postgres_data 2>/dev/null || true
	@$(MAKE) up
	@sleep 3
	@$(MAKE) db-push
	@echo "$(GREEN)Database reset complete$(NC)"

# =============================================================================
# CODE QUALITY
# =============================================================================

type-check: ## Run TypeScript type checking
	@echo "$(CYAN)Running type checks...$(NC)"
	pnpm type-check
	@echo "$(GREEN)Type check passed$(NC)"

lint: ## Run ESLint
	@echo "$(CYAN)Running linter...$(NC)"
	pnpm lint
	@echo "$(GREEN)Linting passed$(NC)"

lint-fix: ## Run ESLint with auto-fix
	@echo "$(CYAN)Running linter with auto-fix...$(NC)"
	pnpm lint -- --fix
	@echo "$(GREEN)Lint fix complete$(NC)"

format: ## Format all files with Prettier
	@echo "$(CYAN)Formatting code...$(NC)"
	pnpm format
	@echo "$(GREEN)Formatting complete$(NC)"

format-check: ## Check formatting without writing changes
	@echo "$(CYAN)Checking code formatting...$(NC)"
	pnpm format-check
	@echo "$(GREEN)Formatting check passed$(NC)"

check: type-check lint format-check ## Run all checks (type-check, lint, format)

# =============================================================================
# BUILD & PRODUCTION
# =============================================================================

build: ## Build application for production
	@echo "$(CYAN)Building application...$(NC)"
	pnpm build
	@echo "$(GREEN)Build complete$(NC)"

prod-up: ## Build and start production stack (Postgres + App)
	@echo "$(CYAN)Starting production stack...$(NC)"
	docker compose up -d --build
	@echo ""
	@echo "$(GREEN)Production stack running$(NC)"
	@echo ""
	@echo "  App:        http://localhost:3000"
	@echo "  PostgreSQL: localhost:5432"
	@echo ""

prod-down: ## Stop production stack
	@echo "$(CYAN)Stopping production stack...$(NC)"
	docker compose down
	@echo "$(GREEN)Production stack stopped$(NC)"

prod-logs: ## Follow production logs
	docker compose logs -f

prod-ps: ## Show production container status
	docker compose ps

prod-restart: ## Restart production stack
	@echo "$(CYAN)Restarting production stack...$(NC)"
	docker compose restart
	@echo "$(GREEN)Production stack restarted$(NC)"

prod-reset: prod-down ## Reset production stack (WARNING: destroys all data)
	@echo "$(RED)Resetting production data...$(NC)"
	docker volume rm immo-manager_postgres_data 2>/dev/null || true
	@echo "$(GREEN)Production data removed$(NC)"
	@echo "$(YELLOW)Run 'make prod-up' to start fresh.$(NC)"

# =============================================================================
# CLEANUP
# =============================================================================

clean: ## Clean all build artifacts and dependencies
	@echo "$(CYAN)Cleaning project...$(NC)"
	rm -rf .next node_modules
	@echo "$(GREEN)Project cleaned$(NC)"

clean-all: clean down ## Clean everything including Docker volumes
	@echo "$(CYAN)Removing Docker volumes...$(NC)"
	docker volume rm immo-manager_postgres_data 2>/dev/null || true
	@echo "$(GREEN)Full cleanup complete$(NC)"

# =============================================================================
# SETUP (First time)
# =============================================================================

setup: ## Initial project setup (run this first!)
	@echo "$(CYAN)Setting up project...$(NC)"
	@echo ""
	@cp -n .env.example .env 2>/dev/null || echo "   .env already exists"
	@$(MAKE) install
	@$(MAKE) up
	@sleep 3
	@$(MAKE) db-generate
	@$(MAKE) db-push
	@echo ""
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Review and update .env file"
	@echo "  2. Run 'make dev' to start development"
	@echo ""
