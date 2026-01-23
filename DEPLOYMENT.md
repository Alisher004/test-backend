# Инструкция по развертыванию

## Требования

- Docker версии 20.10 или выше
- Docker Compose версии 1.29 или выше

## Быстрый старт

### 1. Создайте файл `.env`

Скопируйте пример и настройте переменные окружения:

```bash
cp .env.example .env
```

Отредактируйте `.env` файл и установите необходимые значения:

```env
# Server Configuration
PORT=5001
NODE_ENV=production

# Database Configuration
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=okurmen_test
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your-very-secure-secret-key-min-32-characters

# CORS Configuration (опционально)
# "*" или "all" - разрешить все origins (по умолчанию)
# Или укажите конкретные домены через запятую: https://domain1.com,https://domain2.com
ALLOWED_ORIGINS=*
```

**Важно:** В продакшене обязательно измените:
- `DB_PASSWORD` - используйте надежный пароль
- `JWT_SECRET` - используйте длинный случайный ключ (минимум 32 символа)
- `ALLOWED_ORIGINS` - укажите домены вашего фронтенда (через запятую без пробелов)

### 2. Запуск в продакшене

```bash
# Сборка и запуск контейнеров
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f backend

# Остановка
docker-compose down

# Остановка с удалением volumes (удалит данные БД!)
docker-compose down -v
```

### 3. Запуск для разработки

```bash
# Используйте docker-compose.dev.yml
docker-compose -f docker-compose.dev.yml up --build

# В отдельном терминале для просмотра логов
docker-compose -f docker-compose.dev.yml logs -f
```

## Проверка работы

После запуска проверьте:

1. **API endpoint:**
   ```bash
   curl http://localhost:5001/api/test
   ```

2. **Логи контейнеров:**
   ```bash
   docker-compose logs backend
   docker-compose logs postgres
   ```

3. **Статус контейнеров:**
   ```bash
   docker-compose ps
   ```

## Структура сервисов

- **backend** - Node.js приложение на порту 5001
- **postgres** - PostgreSQL база данных на порту 5432

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт приложения | 5001 |
| `NODE_ENV` | Окружение (production/development) | production |
| `DB_HOST` | Хост базы данных | postgres |
| `DB_USER` | Пользователь БД | postgres |
| `DB_PASSWORD` | Пароль БД | postgres |
| `DB_NAME` | Имя базы данных | okurmen_test |
| `DB_PORT` | Порт БД | 5432 |
| `JWT_SECRET` | Секретный ключ для JWT | - |
| `ALLOWED_ORIGINS` | Разрешенные CORS origins ("*" для всех или через запятую) | * (все origins) |

## Полезные команды

```bash
# Перезапуск сервиса
docker-compose restart backend

# Выполнение команд в контейнере
docker-compose exec backend sh

# Подключение к базе данных
docker-compose exec postgres psql -U postgres -d okurmen_test

# Просмотр использования ресурсов
docker stats

# Очистка неиспользуемых образов
docker system prune -a
```

## Миграции базы данных

Если у вас есть SQL миграции, выполните их после первого запуска:

```bash
# Подключитесь к контейнеру БД
docker-compose exec postgres psql -U postgres -d okurmen_test

# Или выполните SQL файл
docker-compose exec -T postgres psql -U postgres -d okurmen_test < migrations.sql
```

## Резервное копирование

### Создание бэкапа БД:

```bash
docker-compose exec postgres pg_dump -U postgres okurmen_test > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Восстановление из бэкапа:

```bash
docker-compose exec -T postgres psql -U postgres okurmen_test < backup.sql
```

## Troubleshooting

### Проблема: Контейнер не запускается

1. Проверьте логи: `docker-compose logs backend`
2. Убедитесь, что порты не заняты: `netstat -tulpn | grep 5001`
3. Проверьте переменные окружения в `.env`

### Проблема: Ошибка подключения к БД

1. Убедитесь, что PostgreSQL контейнер запущен: `docker-compose ps`
2. Проверьте healthcheck: `docker-compose ps postgres`
3. Проверьте логи БД: `docker-compose logs postgres`

### Проблема: Изменения в коде не применяются

В продакшене код копируется в образ при сборке. Для применения изменений:
```bash
docker-compose up -d --build
```

## Безопасность

⚠️ **Важно для продакшена:**

1. Измените все пароли по умолчанию
2. Используйте сильный `JWT_SECRET` (минимум 32 символа)
3. Настройте файрвол для ограничения доступа к портам
4. Регулярно обновляйте Docker образы
5. Используйте HTTPS через reverse proxy (nginx/traefik)
6. Настройте регулярные бэкапы БД

