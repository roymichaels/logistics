.PHONY: help up up-pg down logs rebuild clean secrets health

# Default target
help:
	@echo "Available commands:"
	@echo "  make up       - Start with SQLite + Litestream + MinIO"
	@echo "  make up-pg    - Start with PostgreSQL + pgBouncer + pgBackRest"
	@echo "  make down     - Stop all services"
	@echo "  make logs     - Show logs from all services"
	@echo "  make rebuild  - Rebuild and restart services"
	@echo "  make clean    - Remove all containers, volumes, and images"
	@echo "  make secrets  - Generate required secret files"
	@echo "  make health   - Check health of all services"

# Start with SQLite profile (default)
up: secrets
	@echo "🚀 Starting Logistics Mini App with SQLite + Litestream..."
	docker-compose --profile sqlite up -d
	@echo ""
	@echo "✅ Services started successfully!"
	@echo ""
	@echo "📱 Application URLs:"
	@echo "   Web App:      https://app.localhost"
	@echo "   API:          https://api.localhost"
	@echo "   MinIO Console: http://localhost:9001"
	@echo ""
	@echo "🔍 Useful commands:"
	@echo "   make logs     - View logs"
	@echo "   make health   - Check service health"
	@echo "   make down     - Stop services"

# Start with PostgreSQL profile
up-pg: secrets
	@echo "🚀 Starting Logistics Mini App with PostgreSQL..."
	docker-compose --profile postgres up -d
	@echo ""
	@echo "✅ Services started successfully!"
	@echo ""
	@echo "📱 Application URLs:"
	@echo "   Web App: https://app.localhost"
	@echo "   API:     https://api.localhost"
	@echo ""
	@echo "🔍 Useful commands:"
	@echo "   make logs     - View logs"
	@echo "   make health   - Check service health"
	@echo "   make down     - Stop services"

# Stop all services
down:
	@echo "🛑 Stopping all services..."
	docker-compose --profile sqlite --profile postgres down
	@echo "✅ All services stopped"

# Show logs
logs:
	docker-compose logs -f

# Rebuild and restart
rebuild:
	@echo "🔄 Rebuilding services..."
	docker-compose build --no-cache
	docker-compose --profile sqlite --profile postgres down
	docker-compose --profile sqlite up -d
	@echo "✅ Services rebuilt and restarted"

# Clean everything
clean:
	@echo "🧹 Cleaning up containers, volumes, and images..."
	docker-compose --profile sqlite --profile postgres down -v --remove-orphans
	docker system prune -af --volumes
	@echo "✅ Cleanup complete"

# Generate secret files
secrets:
	@echo "🔐 Generating secret files..."
	@mkdir -p secrets
	@if [ ! -f secrets/postgres_password.txt ]; then \
		openssl rand -base64 32 > secrets/postgres_password.txt; \
		echo "Generated postgres_password.txt"; \
	fi
	@if [ ! -f secrets/sqlite_key.txt ]; then \
		openssl rand -hex 32 > secrets/sqlite_key.txt; \
		echo "Generated sqlite_key.txt"; \
	fi
	@if [ ! -f secrets/telegram_bot_token.txt ]; then \
		echo "YOUR_TELEGRAM_BOT_TOKEN_HERE" > secrets/telegram_bot_token.txt; \
		echo "⚠️  Please update secrets/telegram_bot_token.txt with your actual bot token"; \
	fi
	@if [ ! -f secrets/jwt_secret.txt ]; then \
		openssl rand -base64 64 > secrets/jwt_secret.txt; \
		echo "Generated jwt_secret.txt"; \
	fi
	@if [ ! -f secrets/minio_access_key.txt ]; then \
		echo "minioadmin" > secrets/minio_access_key.txt; \
		echo "Generated minio_access_key.txt"; \
	fi
	@if [ ! -f secrets/minio_secret_key.txt ]; then \
		openssl rand -base64 32 > secrets/minio_secret_key.txt; \
		echo "Generated minio_secret_key.txt"; \
	fi
	@echo "✅ Secret files ready"

# Check service health
health:
	@echo "🏥 Checking service health..."
	@docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "🔍 Health check details:"
	@docker-compose exec -T api wget -qO- http://localhost:3000/health 2>/dev/null || echo "❌ API health check failed"
	@docker-compose exec -T web wget -qO- http://localhost:80/health 2>/dev/null || echo "❌ Web health check failed"