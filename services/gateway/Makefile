# Gateway Service Makefile

.PHONY: help install dev run test lint format clean docker-build docker-run

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pip install -r requirements.txt

dev: ## Run in development mode
	python main.py

run: ## Run the service
	python main.py

test: ## Run tests
	pytest

lint: ## Run linter
	flake8 app/

format: ## Format code
	black app/
	isort app/

clean: ## Clean up
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +

docker-build: ## Build Docker image
	docker build -t devmatch-gateway .

docker-run: ## Run Docker container
	docker run -p 8000:8000 --env-file env.example devmatch-gateway

docker-compose-up: ## Start with docker-compose
	docker-compose up -d

docker-compose-down: ## Stop docker-compose
	docker-compose down

logs: ## View logs
	docker-compose logs -f gateway

health: ## Check health
	curl http://localhost:8000/health

docs: ## Open API docs
	open http://localhost:8000/docs
