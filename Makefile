# P2P Procurement System Makefile
# ================================
# Optimized Docker management commands

.PHONY: help install dev prod test clean logs shell backup restore security

# Variables
COMPOSE = docker-compose
COMPOSE_PROD = docker-compose -f docker-compose.prod.yml
BACKEND = backend
DB_CONTAINER = db

# Default target
help:
	@echo "P2P Procurement System - Available Commands:"
	@echo ""
	@echo "🚀 Development:"
	@echo "  make dev          - Start development environment"
	@echo "  make dev-tools    - Start development with monitoring tools"
	@echo "  make dev-build    - Build and start development environment"
	@echo "  make logs         - View application logs"
	@echo "  make shell        - Access backend shell"
	@echo ""
	@echo "🏭 Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build and start production (no cache)"
	@echo "  make prod-deploy  - Full production deployment"
	@echo ""
	@echo "🔧 Maintenance:"
	@echo "  make clean        - Clean Docker resources"
	@echo "  make clean-all    - Deep clean (removes volumes)"
	@echo "  make optimize     - Run optimization script"
	@echo "  make backup       - Backup database"
	@echo "  make restore      - Restore database"
	@echo ""
	@echo "🧪 Testing & Security:"
	@echo "  make test         - Run tests"
	@echo "  make security     - Run security checks"
	@echo "  make health       - Check service health"
	@echo ""

# Development commands
dev:
	@echo "🚀 Starting development environment..."
	$(COMPOSE) up -d
	@echo "✅ Development environment started!"
	@echo "📱 Application: http://localhost"
	@echo "🔧 pgAdmin: http://localhost:5050 (admin/admin)"

dev-tools:
	@echo "🚀 Starting development with monitoring tools..."
	$(COMPOSE) --profile tools up -d
	@echo "✅ Development environment with tools started!"
	@echo "📱 Application: http://localhost"
	@echo "🌸 Flower: http://localhost:5555 (admin/admin)"
	@echo "🔧 pgAdmin: http://localhost:5050 (admin/admin)"
	@echo "📊 Redis Commander: http://localhost:8081 (admin/admin)"

dev-build:
	@echo "🔨 Building and starting development environment..."
	$(COMPOSE) build --parallel
	$(COMPOSE) up -d
	@echo "✅ Development environment built and started!"

# Production commands
prod:
	@echo "🏭 Starting production environment..."
	$(COMPOSE_PROD) up -d
	@echo "✅ Production environment started!"

prod-build:
	@echo "🔨 Building production environment (no cache)..."
	$(COMPOSE_PROD) build --no-cache --parallel
	$(COMPOSE_PROD) up -d
	@echo "✅ Production environment built and started!"

prod-deploy:
	@echo "🚀 Full production deployment..."
	@echo "⚠️  This will rebuild everything from scratch!"
	@read -p "Continue? (y/N): " confirm && [ "$$confirm" = "y" ]
	$(COMPOSE_PROD) down --remove-orphans
	$(COMPOSE_PROD) build --no-cache --parallel
	$(COMPOSE_PROD) up -d
	@echo "✅ Production deployment completed!"

# Utility commands
logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f $(BACKEND)

logs-frontend:
	$(COMPOSE) logs -f frontend

logs-nginx:
	$(COMPOSE) logs -f nginx

logs-celery:
	$(COMPOSE) logs -f celery_worker celery_beat

shell:
	@echo "🐍 Opening Django shell..."
	$(COMPOSE) exec $(BACKEND) python manage.py shell

shell-db:
	@echo "🐘 Opening PostgreSQL shell..."
	$(COMPOSE) exec $(DB_CONTAINER) psql -U postgres -d p2p_procurement

shell-redis:
	@echo "📦 Opening Redis CLI..."
	$(COMPOSE) exec redis redis-cli -a $$(grep REDIS_PASSWORD .env | cut -d '=' -f2)

backend-shell:
	@echo "🖥️  Opening backend container shell..."
	$(COMPOSE) exec $(BACKEND) bash

# Maintenance commands
clean:
	@echo "🧹 Cleaning Docker resources..."
	$(COMPOSE) down --remove-orphans
	docker system prune -f
	@echo "✅ Cleanup completed!"

clean-all:
	@echo "🧹 Deep cleaning Docker resources..."
	@echo "⚠️  This will remove ALL volumes and data!"
	@read -p "Continue? (y/N): " confirm && [ "$$confirm" = "y" ]
	$(COMPOSE) down -v --remove-orphans
	$(COMPOSE_PROD) down -v --remove-orphans
	docker system prune -a -f
	docker volume prune -f
	@echo "✅ Deep cleanup completed!"

optimize:
	@echo "⚡ Running Docker optimization..."
	@if [ -f "scripts/docker-cleanup.sh" ]; then \
		chmod +x scripts/docker-cleanup.sh && ./scripts/docker-cleanup.sh; \
	else \
		powershell -ExecutionPolicy Bypass -File scripts/docker-cleanup.ps1; \
	fi

stop:
	@echo "⏹️  Stopping all services..."
	$(COMPOSE) down
	$(COMPOSE_PROD) down
	@echo "✅ All services stopped!"

restart:
	@echo "🔄 Restarting services..."
	$(COMPOSE) restart
	@echo "✅ Services restarted!"

# Database commands
migrate:
	@echo "📊 Running database migrations..."
	$(COMPOSE) exec $(BACKEND) python manage.py migrate
	@echo "✅ Migrations completed!"

makemigrations:
	@echo "📝 Creating new migrations..."
	$(COMPOSE) exec $(BACKEND) python manage.py makemigrations
	@echo "✅ Migrations created!"

superuser:
	@echo "👤 Creating superuser..."
	$(COMPOSE) exec $(BACKEND) python manage.py createsuperuser

collectstatic:
	@echo "📁 Collecting static files..."
	$(COMPOSE) exec $(BACKEND) python manage.py collectstatic --noinput
	@echo "✅ Static files collected!"

# Testing
test:
	@echo "🧪 Running tests..."
	$(COMPOSE) exec $(BACKEND) python manage.py test
	@echo "✅ Tests completed!"

test-coverage:
	@echo "📊 Running tests with coverage..."
	$(COMPOSE) exec $(BACKEND) coverage run --source='.' manage.py test
	$(COMPOSE) exec $(BACKEND) coverage report
	$(COMPOSE) exec $(BACKEND) coverage html
	@echo "✅ Coverage report generated!"

# Security and health checks
security:
	@echo "🔒 Running security checks..."
	$(COMPOSE) exec $(BACKEND) python manage.py check --deploy
	@echo "✅ Security checks completed!"

health:
	@echo "🏥 Checking service health..."
	@echo "Backend Health:"
	@curl -f http://localhost/api/health/ || echo "❌ Backend unhealthy"
	@echo "\nNginx Health:"
	@curl -f http://localhost/health || echo "❌ Nginx unhealthy"
	@echo "\nDocker Service Status:"
	$(COMPOSE) ps
	@echo "✅ Health check completed!"

# Backup and restore
backup:
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	$(COMPOSE) exec $(DB_CONTAINER) pg_dump -U postgres p2p_procurement > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory!"

restore:
	@echo "📥 Restoring database from backup..."
	@ls -la backups/
	@read -p "Enter backup file name (from backups/): " backup_file; \
	$(COMPOSE) exec -T $(DB_CONTAINER) psql -U postgres p2p_procurement < backups/$$backup_file
	@echo "✅ Database restored!"

# Performance monitoring
stats:
	@echo "📊 Docker resource usage:"
	docker stats --no-stream

ps:
	@echo "📋 Service status:"
	$(COMPOSE) ps

top:
	@echo "🔝 Container processes:"
	$(COMPOSE) top

# Environment management
env-check:
	@echo "🔍 Environment configuration check:"
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found! Copy from .env.example"; \
		exit 1; \
	fi
	@echo "✅ .env file exists"
	@echo "📋 Current environment: $$(grep ENVIRONMENT .env | cut -d '=' -f2)"

env-prod:
	@echo "🏭 Setting up production environment..."
	@if [ ! -f .env.production ]; then \
		echo "❌ .env.production file not found!"; \
		exit 1; \
	fi
	cp .env.production .env
	@echo "✅ Production environment configured!"

# Quick setup commands
setup-dev:
	@echo "🚀 Setting up development environment..."
	@if [ ! -f .env ]; then cp .env.example .env; fi
	$(COMPOSE) build --parallel
	$(COMPOSE) up -d
	@echo "⏳ Waiting for services to start..."
	@sleep 10
	$(COMPOSE) exec $(BACKEND) python manage.py migrate
	@echo "✅ Development environment ready!"
	@echo "📱 Application: http://localhost"

setup-prod:
	@echo "🏭 Setting up production environment..."
	@echo "⚠️  Make sure to configure .env.production first!"
	@read -p "Continue? (y/N): " confirm && [ "$$confirm" = "y" ]
	cp .env.production .env
	$(COMPOSE_PROD) build --no-cache --parallel
	$(COMPOSE_PROD) up -d
	@echo "⏳ Waiting for services to start..."
	@sleep 15
	$(COMPOSE_PROD) exec $(BACKEND) python manage.py migrate
	$(COMPOSE_PROD) exec $(BACKEND) python manage.py collectstatic --noinput
	@echo "✅ Production environment ready!"

# Legacy compatibility
build: dev-build
up: dev
down: stop
check: security