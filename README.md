# DevMatch Backend

Микросервисная платформа для подбора исполнителей и контроля качества задач в разработке ПО.

## Архитектура

Платформа состоит из следующих сервисов:

- **Gateway** (Python/FastAPI:8000) - единая точка входа API
- **User Service** (Go/gRPC:50051) - управление пользователями и разработчиками
- **Task Service** (Go/gRPC:50052) - управление задачами
- **Orchestrator** (Go/gRPC:50053) - система матчинга и оркестрации
- **Recommendation Service** (Go/gRPC:50054) - система рекомендаций
- **Presence Service** (Go/HTTP:8080) - управление присутствием пользователей

## Быстрый старт

> 📖 **Для быстрого старта см. [QUICKSTART.md](./QUICKSTART.md)**

### 1. Клонирование и настройка

```bash
git clone <repository-url>
cd backend
```

### 2. Установка зависимостей

```bash
# Установка всех зависимостей (Go + Python)
make deps
```

### 3. Запуск всей платформы

```bash
# Запуск всех сервисов с Docker Compose
make dev
```

Эта команда:
- Запустит PostgreSQL, Redis, NATS
- Применит миграции базы данных
- Сгенерирует protobuf код
- Установит Python зависимости для Gateway
- Соберет все Go сервисы
- Запустит все контейнеры

### 3. Доступ к сервисам

- **Gateway API**: http://localhost:8000
- **API Документация**: http://localhost:8000/docs
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Разработка

### Доступные команды

```bash
make help              # Показать все доступные команды
make dev               # Полная настройка dev окружения
make build             # Сборка всех сервисов
make test              # Запуск тестов
make docker-up         # Запуск только инфраструктуры
make docker-down       # Остановка всех сервисов
make migrate-up        # Применение миграций
make migrate-down      # Откат миграций
```

### Локальная разработка

```bash
# 1. Запуск инфраструктуры
make docker-up

# 2. Применение миграций
make migrate-up

# 3. Генерация protobuf кода
make proto-gen

# 4. Сборка сервисов
make build

# 5. Запуск сервисов локально
make run-local
```

### Структура проекта

```
backend/
├── services/
│   ├── gateway/           # Gateway сервис (Python/FastAPI)
│   ├── userservice/       # User Service (Go/gRPC)
│   ├── taskservice/       # Task Service (Go/gRPC)
│   ├── orchestrator/      # Orchestrator (Go/gRPC)
│   ├── recommendationservice/ # Recommendation Service (Go/gRPC)
│   └── presenceservice/   # Presence Service (Go/HTTP)
├── proto/                 # Protocol Buffer определения
├── migrations/            # Миграции базы данных
├── monitoring/            # Конфигурация мониторинга
├── docker-compose.yml     # Docker Compose конфигурация
└── Makefile              # Команды для разработки
```

## API

### Gateway API (http://localhost:8000)

Основные endpoints:

- `POST /api/v1/auth/register` - регистрация пользователя
- `POST /api/v1/auth/login` - вход в систему
- `GET /api/v1/users/me` - профиль пользователя
- `POST /api/v1/tasks/` - создание задачи
- `GET /api/v1/tasks/{id}` - получение задачи
- `GET /api/v1/matching/recommendations/{id}` - рекомендации

Полная документация доступна по адресу: http://localhost:8000/docs

## Мониторинг

### Grafana Dashboards
- Service Performance Dashboard
- Infrastructure Metrics Dashboard
- Business Metrics Dashboard

### Prometheus Metrics
- gRPC request metrics
- Database connection metrics
- NATS message throughput
- Custom business metrics

## Тестирование

```bash
# Запуск всех тестов
make test

# Запуск тестов конкретного сервиса
cd services/userservice && go test ./...

# Запуск gateway тестов
cd services/gateway && python -m pytest
```

## Развертывание

### Docker Compose (рекомендуется для разработки)

```bash
make docker-up
```

### Kubernetes (production)

```bash
kubectl apply -f k8s/
```

## Требования

- Go 1.24.5+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- NATS 2.10+

## Лицензия

MIT License