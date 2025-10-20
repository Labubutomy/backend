# 🚀 DevMatch AI - Быстрый старт

## Одна команда для запуска всего проекта

```bash
make dev
```

Эта команда автоматически:
- ✅ Проверит все зависимости
- ✅ Сгенерирует protobuf файлы
- ✅ Запустит все сервисы через Docker
- ✅ Дождется готовности базы данных
- ✅ Применит миграции
- ✅ Запустит веб-приложение

## 📋 Что запустится

После выполнения `make dev` будут доступны:

- **🌐 Web App**: http://localhost
- **🔌 Gateway API**: http://localhost:8000
- **📚 API Docs**: http://localhost:8000/docs
- **📊 Grafana**: http://localhost:3000 (admin/admin123)
- **📈 Prometheus**: http://localhost:9090
- **🗄️ PostgreSQL**: localhost:5432
- **🔴 Redis**: localhost:6379

## 🛠️ Управление

```bash
# Остановка всех сервисов
make docker-down

# Полная очистка и перезапуск
make dev-restart

# Просмотр логов
docker-compose logs -f

# Просмотр статуса
docker-compose ps
```

## 🔧 Разработка

```bash
# Только веб-клиент в dev режиме
make web-dev

# Сборка только веб-клиента
make web-build
```

## ❗ Требования

- Docker Desktop
- Go 1.21+
- Protocol Buffers compiler (protoc)
- Make

## 🆘 Если что-то не работает

```bash
# Полная очистка
make dev-clean

# Перезапуск
make dev
```

---

**Готово!** Теперь вы можете открыть http://localhost и начать работу с приложением! 🎉
