.PHONY: dev prod down clean logs ps

# Development environment
dev:
	docker compose -f docker-compose.dev.yml up

dev-build:
	docker compose -f docker-compose.dev.yml up --build

dev-down:
	docker compose -f docker-compose.dev.yml down

# Production environment
prod:
	docker compose -f docker-compose.prod.yml up -d

prod-build:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down

# Common commands
down:
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.prod.yml down

clean:
	docker compose -f docker-compose.dev.yml down -v
	docker compose -f docker-compose.prod.yml down -v

logs-dev:
	docker compose -f docker-compose.dev.yml logs -f

logs-prod:
	docker compose -f docker-compose.prod.yml logs -f

ps:
	docker compose -f docker-compose.dev.yml ps
	docker compose -f docker-compose.prod.yml ps