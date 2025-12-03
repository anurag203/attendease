.PHONY: help up down logs restart clean build migrate install-backend mobile status

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Attendance App - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

up: ## Start all services (backend + database)
	@echo "$(BLUE)🚀 Starting all services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Services are running!$(NC)"
	@echo "$(YELLOW)📱 To start mobile app, run: make mobile$(NC)"
	@echo "$(YELLOW)📊 Backend API: http://localhost:3001$(NC)"
	@echo "$(YELLOW)🗄️  PostgreSQL: localhost:5432$(NC)"

down: ## Stop all services
	@echo "$(BLUE)🛑 Stopping all services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✅ Services stopped$(NC)"

logs: ## View logs from all services
	docker-compose logs -f

restart: ## Restart all services
	@echo "$(BLUE)🔄 Restarting services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✅ Services restarted$(NC)"

clean: ## Stop services and remove volumes
	@echo "$(YELLOW)⚠️  This will remove all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)✅ Cleaned up$(NC)"; \
	fi

build: ## Rebuild all Docker images
	@echo "$(BLUE)🔨 Building Docker images...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✅ Build complete$(NC)"

migrate: ## Run database migrations
	@echo "$(BLUE)🔄 Running database migrations...$(NC)"
	docker-compose exec backend npm run migrate
	@echo "$(GREEN)✅ Migrations complete$(NC)"

install-backend: ## Install backend dependencies
	@echo "$(BLUE)📦 Installing backend dependencies...$(NC)"
	cd backend && npm install
	@echo "$(GREEN)✅ Backend dependencies installed$(NC)"

mobile: ## Start React Native Expo mobile app
	@echo "$(BLUE)📱 Starting mobile app...$(NC)"
	@echo "$(YELLOW)Make sure backend is running (run 'make up' first)$(NC)"
	npm start

status: ## Show status of all services
	@echo "$(BLUE)📊 Service Status:$(NC)"
	@docker-compose ps
