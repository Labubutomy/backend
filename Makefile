# Makefile for freelance platform development

# Environment setup
SHELL := /bin/bash
export PATH := /usr/local/go/bin:/Applications/Docker.app/Contents/Resources/bin:$(PATH)
export GOPATH := $(HOME)/go
export PATH := $(PATH):$(GOPATH)/bin

.PHONY: help proto-gen proto-clean build test run-local docker-build docker-up docker-down migrate-up migrate-down setup-env

# Default target
help:
	@echo "Available commands:"
	@echo "  setup-env     - Setup Go environment variables"
	@echo "  deps          - Install all dependencies (Go + Python)"
	@echo "  proto-gen     - Generate Go code from protobuf files"
	@echo "  proto-clean   - Clean generated protobuf files"  
	@echo "  build         - Build all services (Go + Python)"
	@echo "  test          - Run Go tests"
	@echo "  test-platform - Test entire platform (Gateway API)"
	@echo "  test-all      - Run all tests"
	@echo "  run-local     - Run services locally"
	@echo "  docker-build  - Build Docker images"
	@echo "  docker-up     - Start development environment"
	@echo "  docker-down   - Stop development environment"
	@echo "  migrate-up    - Apply database migrations"
	@echo "  migrate-down  - Rollback database migrations"
	@echo "  dev           - Full development setup"

# Protocol buffer generation
PROTO_PATH = ./proto
PROTO_GEN_PATH = ./proto/gen/go

proto-gen:
	@echo "Generating protobuf files..."
	@mkdir -p $(PROTO_GEN_PATH)
	@find $(PROTO_PATH) -name "*.proto" -exec protoc \
		--proto_path=$(PROTO_PATH) \
		--go_out=$(PROTO_GEN_PATH) \
		--go_opt=paths=source_relative \
		--go-grpc_out=$(PROTO_GEN_PATH) \
		--go-grpc_opt=paths=source_relative \
		{} \;
	@echo "Protobuf generation completed"

proto-clean:
	@echo "Cleaning generated protobuf files..."
	@rm -rf $(PROTO_GEN_PATH)
	@echo "Protobuf files cleaned"

# Build all services
build: proto-gen
	@echo "Building all services..."
	@go build -o bin/orchestrator ./services/orchestrator/cmd/orchestrator
	@go build -o bin/userservice ./services/userservice/cmd/userservice  
	@go build -o bin/taskservice ./services/taskservice/cmd/taskservice
	@go build -o bin/presenceservice ./services/presenceservice/cmd/presenceservice
	@go build -o bin/recommendationservice ./services/recommendationservice/cmd/recommendationservice
	@echo "Installing gateway dependencies..."
	@./scripts/install-gateway-deps.sh
	@echo "Build completed"

# Run tests
test:
	@echo "Running Go tests..."
	@go test -v -race ./...
	@echo "Go tests completed"

test-platform:
	@echo "Testing entire platform..."
	@python3 test-platform.py
	@echo "Platform tests completed"

test-all: test test-platform
	@echo "All tests completed"

# Run load tests (requires k6)
load-test:
	@echo "Running load tests..."
	@k6 run tests/load/websocket_test.js
	@k6 run tests/load/matching_latency_test.js

# Run services locally (requires dependencies)
run-local: build
	@echo "Starting services locally..."
	@./bin/orchestrator &
	@./bin/userservice &
	@./bin/taskservice &
	@./bin/presenceservice &
	@./bin/recommendationservice &
	@echo "Starting gateway service..."
	@cd services/gateway && python main.py &
	@echo "Services started. Press Ctrl+C to stop."

# Docker commands
docker-build:
	@echo "Building Docker images..."
	@docker build -t freelance-platform/orchestrator -f docker/orchestrator/Dockerfile .
	@docker build -t freelance-platform/userservice -f docker/userservice/Dockerfile .
	@docker build -t freelance-platform/taskservice -f docker/taskservice/Dockerfile .
	@docker build -t freelance-platform/presenceservice -f docker/presenceservice/Dockerfile .
	@docker build -t freelance-platform/recommendationservice -f docker/recommendationservice/Dockerfile .
	@docker build -t freelance-platform/gateway -f services/gateway/Dockerfile ./services/gateway
	@echo "Docker images built"

docker-up:
	@echo "Starting development environment..."
	@docker compose up -d
	@echo "Development environment started"

docker-down:
	@echo "Stopping development environment..."
	@docker compose down
	@echo "Development environment stopped"

# Database migrations (requires migrate tool)
migrate-up:
	@echo "Applying database migrations..."
	@migrate -database "postgres://postgres:postgres@localhost:5432/freelance_platform?sslmode=disable" -path migrations up
	@echo "Migrations applied"

migrate-down:
	@echo "Rolling back database migrations..."
	@migrate -database "postgres://postgres:postgres@localhost:5432/freelance_platform?sslmode=disable" -path migrations down
	@echo "Migrations rolled back"

migrate-create:
	@echo "Creating new migration..."
	@migrate create -ext sql -dir migrations -seq $(name)
	@echo "Migration files created"

# Development helpers
deps:
	@echo "Installing development dependencies..."
	@go mod tidy
	@go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	@go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	@go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@echo "Installing gateway dependencies..."
	@./scripts/install-gateway-deps.sh
	@echo "All dependencies installed"

format:
	@echo "Formatting code..."
	@go fmt ./...
	@echo "Code formatted"

lint:
	@echo "Running linter..."
	@golangci-lint run
	@echo "Linting completed"

# Environment setup
setup-env:
	@echo "Setting up development environment..."
	@./scripts/setup-env.sh

# Cleanup
clean: proto-clean
	@echo "Cleaning build artifacts..."
	@rm -rf bin/
	@rm -rf vendor/
	@go clean -cache
	@echo "Cleanup completed"

# Development workflow
dev: docker-up migrate-up proto-gen build
	@echo "Development environment ready!"
	@echo "Services:"  
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"
	@echo "  - NATS: localhost:4222"
	@echo "  - Gateway API: http://localhost:8000"
	@echo "  - API Docs: http://localhost:8000/docs"
	@echo "  - Grafana: http://localhost:3000"
	@echo "  - Prometheus: http://localhost:9090"

# Production build
prod-build: proto-gen test
	@echo "Building for production..."
	@CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/orchestrator ./services/orchestrator/cmd/orchestrator
	@CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/userservice ./services/userservice/cmd/userservice
	@CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/taskservice ./services/taskservice/cmd/taskservice
	@CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/presenceservice ./services/presenceservice/cmd/presenceservice
	@CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/recommendationservice ./services/recommendationservice/cmd/recommendationservice
	@echo "Production build completed"