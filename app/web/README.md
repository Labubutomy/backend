# DevMatch AI Frontend

## Описание

Frontend приложение DevMatch AI, собранное с nginx для продакшена. Приложение работает на порту 80 и содержит только клиентскую часть.

## Настройка переменных окружения

Создайте файл `.env` в корне проекта `app/web/` со следующим содержимым:

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api/v1

# Development settings
VITE_NODE_ENV=development
```

## Запуск проекта

### Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build
```

### Docker развертывание (Продакшен)

```bash
# Из корневой директории проекта:
make web-build    # Сборка Docker образа
make web-prod     # Запуск в продакшене

# Или с docker-compose (из корневой директории):
docker-compose up web -d

# Или вручную:
docker build -t freelance-web .
docker run -p 80:80 freelance-web
```

### Доступ к приложению

После запуска приложение будет доступно по адресу:

- **http://localhost** (порт 80)
- **http://localhost/health** - health check endpoint

## Структура проекта

- `src/shared/api/` - API клиенты для взаимодействия с бэкендом
- `src/shared/config/` - Конфигурация приложения
- `src/pages/` - Страницы приложения
- `src/shared/ui/` - Переиспользуемые UI компоненты
- `src/shared/layout/` - Компоненты макета

## API Endpoints

Приложение настроено для работы с API по адресу `http://localhost:8000/api/v1`.

Для изменения адреса API обновите переменную `VITE_API_URL` в файле `.env`.

## Особенности

- **Темная тема по умолчанию** - современный дизайн с темной цветовой схемой
- **Русская локализация** - весь интерфейс переведен на русский язык
- **Адаптивный дизайн** - поддержка мобильных устройств
- **Effector для состояния** - управление состоянием приложения
- **Atomic Router** - маршрутизация
- **Tailwind CSS** - стилизация

## Доступные страницы

### Публичные

- `/` - Главная страница (лендинг)
- `/auth` - Авторизация и регистрация

### Для заказчиков

- `/customer/dashboard` - Дашборд заказчика
- `/customer/tasks/new` - Создание задачи
- `/customer/tasks/:id` - Детали задачи
- `/customer/freelancers` - Выбор исполнителей

### Для исполнителей

- `/freelancer/dashboard` - Дашборд исполнителя
- `/freelancer/tasks` - Доступные задачи
- `/freelancer/my-tasks` - Мои задачи (текущие и выполненные)
- `/freelancer/profile` - Профиль исполнителя

### Общие

- `/notifications` - Уведомления
