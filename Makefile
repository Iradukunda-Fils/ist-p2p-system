# ==============================================================================
# P2P Procurement System Makefile
# ==============================================================================
# A professional interface for managing the P2P Procurement System Docker environment.
# Supports Development and Production workflows.
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

# Docker Compose Command (Use 'docker compose' for v2, 'docker-compose' for v1)
DOCKER_COMPOSE := docker compose

# Files
COMPOSE_DEV  := -f docker-compose.yml
COMPOSE_PROD := -f docker-compose.prod.yml

# Services (Must match names in docker-compose.yml)
SERVICE_BACKEND := backend
SERVICE_FRONTEND := frontend
SERVICE_DB := db
SERVICE_REDIS := redis
SERVICE_NGINX := nginx
SERVICE_WORKER := celery_worker
SERVICE_BEAT := celery_beat

# Shell Colors
GREEN  := \033[0;32m
BLUE   := \033[0;34m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m # No Color

# ------------------------------------------------------------------------------
# Default Target
# ------------------------------------------------------------------------------

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "${BLUE}P2P Procurement System Management${NC}"
	@echo "==================================="
	@echo ""
	@echo "${YELLOW}Usage:${NC}"
	@echo "  make ${GREEN}<target>${NC}"
	@echo ""
	@echo "${YELLOW}Development Targets:${NC}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  ${GREEN}%-20s${NC} %s\n", $$1, $$2}' | grep -v "prod-"
	@echo ""
	@echo "${YELLOW}Production Targets:${NC}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  ${GREEN}%-20s${NC} %s\n", $$1, $$2}' | grep "prod-"
	@echo ""

# ------------------------------------------------------------------------------
# Development Commands
# ------------------------------------------------------------------------------

.PHONY: dev
dev: ## Start development environment (detached)
	@echo "${BLUE}🚀 Starting development environment...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d
	@echo "${GREEN}✅ Development environment started!${NC}"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:8000"
	@echo "   API Docs: http://localhost:8000/api/docs/"

.PHONY: dev-build
dev-build: ## Build and start development environment
	@echo "${BLUE}🔨 Building development environment...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d --build
	@echo "${GREEN}✅ Build complete and started!${NC}"

.PHONY: dev-stop
dev-stop: ## Stop development environment
	@echo "${BLUE}🛑 Stopping development environment...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) stop
	@echo "${GREEN}✅ Stopped!${NC}"

.PHONY: dev-down
dev-down: ## Stop and remove development containers
	@echo "${BLUE}🧹 Removing development containers...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) down
	@echo "${GREEN}✅ Removed!${NC}"

.PHONY: dev-logs
dev-logs: ## Follow development logs (all services)
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f

# ------------------------------------------------------------------------------
# Production Commands
# ------------------------------------------------------------------------------

.PHONY: prod
prod: ## Start production environment
	@echo "${BLUE}🏭 Starting production environment...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) up -d
	@echo "${GREEN}✅ Production environment started!${NC}"
	@echo "   Application: http://localhost"

.PHONY: prod-build
prod-build: ## Build and start production environment
	@echo "${BLUE}🔨 Building production environment...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) up -d --build
	@echo "${GREEN}✅ Production build complete!${NC}"

.PHONY: prod-down
prod-down: ## Stop and remove production containers
	@echo "${BLUE}🛑 Stopping production environment...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) down
	@echo "${GREEN}✅ Stopped!${NC}"

.PHONY: prod-logs
prod-logs: ## Follow production logs
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) logs -f

# ------------------------------------------------------------------------------
# Service Management
# ------------------------------------------------------------------------------

.PHONY: restart-backend
restart-backend: ## Restart backend service
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) restart $(SERVICE_BACKEND)

.PHONY: restart-frontend
restart-frontend: ## Restart frontend service
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) restart $(SERVICE_FRONTEND)

.PHONY: restart-celery
restart-celery: ## Restart Celery workers and beat
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) restart $(SERVICE_WORKER) $(SERVICE_BEAT)

# ------------------------------------------------------------------------------
# Database & Django Commands
# ------------------------------------------------------------------------------

.PHONY: migrate
migrate: ## Run database migrations
	@echo "${BLUE}📦 Running migrations...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec $(SERVICE_BACKEND) python manage.py migrate
	@echo "${GREEN}✅ Migrations complete!${NC}"

.PHONY: makemigrations
makemigrations: ## Create new migrations
	@echo "${BLUE}📝 Creating migrations...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec $(SERVICE_BACKEND) python manage.py makemigrations
	@echo "${GREEN}✅ Done!${NC}"

.PHONY: superuser
superuser: ## Create a Django superuser
	@echo "${BLUE}👤 Creating superuser...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec -it $(SERVICE_BACKEND) python manage.py createsuperuser

.PHONY: shell
shell: ## Open Django shell
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec -it $(SERVICE_BACKEND) python manage.py shell

.PHONY: dbshell
dbshell: ## Open Database shell (psql)
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec -it $(SERVICE_DB) psql -U postgres -d p2p_procurement

.PHONY: collectstatic
collectstatic: ## Collect static files
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec $(SERVICE_BACKEND) python manage.py collectstatic --noinput

# ------------------------------------------------------------------------------
# Testing & Quality
# ------------------------------------------------------------------------------

.PHONY: test
test: ## Run backend tests
	@echo "${BLUE}🧪 Running tests...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec $(SERVICE_BACKEND) python manage.py test
	@echo "${GREEN}✅ Tests complete!${NC}"

.PHONY: test-frontend
test-frontend: ## Run frontend tests
	@echo "${BLUE}🧪 Running frontend tests...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec $(SERVICE_FRONTEND) npm test

# ------------------------------------------------------------------------------
# Maintenance
# ------------------------------------------------------------------------------

.PHONY: clean
clean: ## Remove stopped containers and unused networks
	@echo "${YELLOW}🧹 Cleaning up...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) down --remove-orphans
	@echo "${GREEN}✅ Cleaned!${NC}"

.PHONY: clean-all
clean-all: ## Deep clean: remove containers, networks, AND volumes (Data Loss!)
	@echo "${RED}⚠️  WARNING: This will delete all database data!${NC}"
	@echo -n "Are you sure? [y/N] " && read ans && [ $${ans:-N} = y ]
	@echo "${YELLOW}🧹 Deep cleaning...${NC}"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) down -v --remove-orphans
	docker system prune -f
	@echo "${GREEN}✅ Deep clean complete!${NC}"

.PHONY: logs-backend
logs-backend: ## View backend logs
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f $(SERVICE_BACKEND)

.PHONY: logs-frontend
logs-frontend: ## View frontend logs
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f $(SERVICE_FRONTEND)

.PHONY: logs-celery
logs-celery: ## View Celery logs
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f $(SERVICE_WORKER) $(SERVICE_BEAT)