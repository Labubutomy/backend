# DevMatch Gateway Service

Gateway service для платформы DevMatch, предоставляющий единую REST API точку входа для всех микросервисов.

## Архитектура

Gateway сервис построен на FastAPI и выполняет следующие функции:

- **Маршрутизация запросов** к соответствующим микросервисам
- **Аутентификация и авторизация** через JWT токены
- **Rate limiting** для защиты от злоупотреблений
- **Circuit breaker** для отказоустойчивости
- **Метрики и мониторинг** через Prometheus
- **Кэширование** через Redis
- **Логирование** структурированных логов

## Микросервисы

Gateway взаимодействует со следующими сервисами:

- **User Service** (gRPC:50051) - управление пользователями и разработчиками
- **Task Service** (gRPC:50052) - управление задачами
- **Recommendation Service** (gRPC:50054) - система рекомендаций и матчинга
- **Presence Service** (HTTP:8080) - управление присутствием пользователей
- **Orchestrator** (gRPC:50053) - оркестрация процессов

## API Endpoints

### Аутентификация
- `POST /api/v1/auth/login` - вход в систему
- `POST /api/v1/auth/register` - регистрация пользователя
- `POST /api/v1/auth/refresh` - обновление токена
- `POST /api/v1/auth/logout` - выход из системы

### Пользователи
- `POST /api/v1/users/developers` - создание профиля разработчика
- `PUT /api/v1/users/developers/{user_id}` - обновление профиля
- `PUT /api/v1/users/developers/{user_id}/presence` - обновление статуса
- `GET /api/v1/users/developers` - список онлайн разработчиков
- `GET /api/v1/users/me` - профиль текущего пользователя

### Задачи
- `POST /api/v1/tasks/` - создание задачи
- `GET /api/v1/tasks/{task_id}` - получение задачи
- `PUT /api/v1/tasks/{task_id}` - обновление задачи
- `GET /api/v1/tasks/` - список задач
- `DELETE /api/v1/tasks/{task_id}` - удаление задачи

### Матчинг
- `POST /api/v1/matching/score` - оценка кандидатов
- `POST /api/v1/matching/filter` - фильтрация кандидатов
- `GET /api/v1/matching/recommendations/{task_id}` - рекомендации для задачи

### Мониторинг
- `GET /health` - базовая проверка здоровья
- `GET /health/detailed` - детальная проверка всех сервисов
- `GET /health/ready` - проверка готовности (Kubernetes)
- `GET /health/live` - проверка жизнеспособности (Kubernetes)

## Установка и запуск

### Из корня проекта (рекомендуется)

```bash
# Запуск всей платформы
make dev

# Или только gateway
make build
cd services/gateway
python main.py
```

### Локальная разработка

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Настройте переменные окружения:
```bash
cp env.example .env
# Отредактируйте .env файл
```

3. Запустите сервис:
```bash
python main.py
```

### Альтернативный запуск

```bash
# Используйте uvicorn напрямую
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker

```bash
# Сборка образа
docker build -t devmatch-gateway .

# Запуск контейнера
docker run -p 8000:8000 --env-file .env devmatch-gateway
```

### Docker Compose

```bash
# Запуск всех сервисов
docker-compose up -d

# Только gateway
docker-compose up gateway
```

## Конфигурация

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `GATEWAY_HOST` | Хост для привязки | `0.0.0.0` |
| `GATEWAY_PORT` | Порт для привязки | `8000` |
| `USER_SERVICE_URL` | URL User Service | `localhost:50051` |
| `TASK_SERVICE_URL` | URL Task Service | `localhost:50052` |
| `RECOMMENDATION_SERVICE_URL` | URL Recommendation Service | `localhost:50054` |
| `PRESENCE_SERVICE_URL` | URL Presence Service | `http://localhost:8080` |
| `REDIS_URL` | URL Redis | `redis://localhost:6379/0` |
| `NATS_URL` | URL NATS | `nats://localhost:4222` |
| `JWT_SECRET` | Секретный ключ для JWT | `your-secret-key` |
| `JWT_EXPIRATION_HOURS` | Время жизни токена (часы) | `24` |
| `RATE_LIMIT_REQUESTS` | Лимит запросов | `1000` |
| `RATE_LIMIT_WINDOW` | Окно лимита (секунды) | `60` |

## Безопасность

- JWT токены для аутентификации
- Rate limiting для защиты от DDoS
- CORS настройки для веб-клиентов
- Валидация входных данных
- Circuit breaker для отказоустойчивости

## Мониторинг

### Метрики Prometheus

- `gateway_requests_total` - общее количество запросов
- `gateway_request_duration_seconds` - время обработки запросов
- `gateway_active_connections` - активные соединения
- `gateway_service_calls_total` - вызовы микросервисов
- `gateway_circuit_breaker_state` - состояние circuit breaker

### Логирование

Структурированные логи в JSON формате с полями:
- `timestamp` - время события
- `level` - уровень логирования
- `service` - имя сервиса
- `request_id` - ID запроса
- `method` - HTTP метод
- `url` - URL запроса
- `status_code` - код ответа
- `duration_ms` - время обработки

## Разработка

### Структура проекта

```
services/gateway/
├── app/
│   ├── config.py              # Конфигурация
│   ├── exceptions.py          # Исключения
│   ├── middleware/            # Middleware
│   │   ├── auth.py           # Аутентификация
│   │   ├── logging.py        # Логирование
│   │   ├── rate_limit.py     # Rate limiting
│   │   └── metrics.py        # Метрики
│   ├── routers/              # API роутеры
│   │   ├── auth.py           # Аутентификация
│   │   ├── users.py          # Пользователи
│   │   ├── tasks.py          # Задачи
│   │   ├── matching.py       # Матчинг
│   │   └── health.py         # Мониторинг
│   └── services/             # Клиенты микросервисов
│       ├── base.py           # Базовые классы
│       ├── user_service.py   # User Service клиент
│       ├── task_service.py   # Task Service клиент
│       ├── recommendation_service.py  # Recommendation Service клиент
│       └── presence_service.py        # Presence Service клиент
├── main.py                   # Точка входа
├── requirements.txt          # Зависимости
├── Dockerfile               # Docker образ
└── README.md               # Документация
```

### Добавление нового endpoint

1. Создайте или обновите роутер в `app/routers/`
2. Добавьте методы в соответствующий сервис-клиент
3. Обновите документацию

### Тестирование

```bash
# Запуск тестов
pytest

# Запуск с покрытием
pytest --cov=app

# Запуск линтера
flake8 app/

# Запуск форматтера
black app/
```

## Производительность

- Асинхронная обработка запросов
- Connection pooling для gRPC
- Кэширование в Redis
- Circuit breaker для отказоустойчивости
- Метрики для мониторинга производительности

## Troubleshooting

### Частые проблемы

1. **Сервис не запускается**
   - Проверьте переменные окружения
   - Убедитесь, что все микросервисы доступны

2. **Ошибки аутентификации**
   - Проверьте JWT_SECRET
   - Убедитесь, что токен не истек

3. **Медленные запросы**
   - Проверьте состояние микросервисов
   - Посмотрите метрики Prometheus
   - Проверьте логи

### Логи

```bash
# Просмотр логов gateway
docker logs freelance_gateway -f

# Просмотр логов всех сервисов
docker-compose logs -f
```

### Метрики

```bash
# Prometheus метрики
curl http://localhost:9090/metrics

# Grafana дашборды
open http://localhost:3000
```
