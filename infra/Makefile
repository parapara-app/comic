.PHONY: help dev staging prod down clean logs ps

# Default target - show help
help:
	@echo "Available commands:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-build    - Build and start development environment"
	@echo "  make dev-down     - Stop development environment"
	@echo "  make staging      - Start staging environment"
	@echo "  make staging-build- Build and start staging environment"
	@echo "  make staging-down - Stop staging environment"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build and start production environment"
	@echo "  make prod-down    - Stop production environment"
	@echo "  make down         - Stop all environments"
	@echo "  make clean        - Stop and remove all volumes"
	@echo "  make logs-dev     - Show development logs"
	@echo "  make logs-staging - Show staging logs"
	@echo "  make logs-prod    - Show production logs"
	@echo "  make ps           - Show running containers for all environments"

# Development environment
dev:
	docker compose -f docker-compose.dev.yml up

dev-build:
	docker compose -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.dev.yml down

dev-restart:
	docker compose -f docker-compose.dev.yml restart

# Staging environment
staging:
	docker compose -f docker-compose.staging.yml up -d

staging-build:
	docker compose -f docker-compose.staging.yml up -d --build

staging-down:
	docker compose -f docker-compose.staging.yml down

staging-restart:
	docker compose -f docker-compose.staging.yml restart

# Production environment
prod:
	docker compose -f docker-compose.prod.yml up -d

prod-build:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

prod-restart:
	docker compose -f docker-compose.prod.yml restart

# Common commands
down:
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.staging.yml down
	docker compose -f docker-compose.prod.yml down

clean:
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.staging.yml down -v
	docker compose -f docker-compose.prod.yml down -v

# Logs
logs-dev:
	docker compose -f docker-compose.dev.yml logs -f

logs-staging:
	docker compose -f docker-compose.staging.yml logs -f

logs-prod:
	docker compose -f docker-compose.prod.yml logs -f

# Status
ps:
	@echo "=== Development ==="
	@docker compose -f docker-compose.dev.yml ps
	@echo "\n=== Staging ==="
	@docker compose -f docker-compose.staging.yml ps
	@echo "\n=== Production ==="
	@docker compose -f docker-compose.prod.yml ps

# Database access
db-dev:
	docker compose -f docker-compose.dev.yml exec postgres psql -U dev_user -d comic_dev

db-staging:
	docker compose -f docker-compose.staging.yml exec backend sh -c 'psql $$DATABASE_URL'

# Backup & Restore (Development)
backup-dev:
	docker compose -f docker-compose.dev.yml exec postgres pg_dump -U dev_user comic_dev > backup_dev_$$(date +%Y%m%d_%H%M%S).sql

restore-dev:
	@read -p "Enter backup file name: " file; \
	docker compose -f docker-compose.dev.yml exec -T postgres psql -U dev_user comic_dev < $$file