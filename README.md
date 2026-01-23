# Okurmen Test Backend

Backend сервер для системы тестирования Окурмен на Node.js и Express.

## Быстрый старт

### С Docker (рекомендуется)

1. **Создайте файл `.env`:**
   ```bash
   # Скопируйте пример (создайте файл вручную)
   # См. раздел "Переменные окружения" ниже
   ```

2. **Запустите приложение:**
   ```bash
   # Продакшен
   ./deploy.sh
   
   # Или вручную
   docker-compose up -d --build
   
   # Разработка
   ./deploy.sh dev
   # Или
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Проверьте работу:**
   ```bash
   curl http://localhost:5001/api/test
   ```

### Без Docker

1. Установите PostgreSQL и создайте базу данных
2. Установите зависимости: `npm install`
3. Создайте `.env` файл с настройками БД
4. Запустите: `npm start` или `npm run dev`

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
PORT=5001
NODE_ENV=production

DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=okurmen_test
DB_PORT=5432

JWT_SECRET=your-very-secure-secret-key-min-32-characters

# Опционально: разрешенные CORS origins (через запятую)
ALLOWED_ORIGINS=https://yourdomain.com
```

## API Endpoints

- `GET /api/test` - Тестовый endpoint
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход
- `GET /api/auth/me` - Текущий пользователь (требует авторизации)
- `GET /api/questions/:id/image` - Получение изображения вопроса

## Структура проекта

```
├── config/          # Конфигурация БД
├── controllers/     # Контроллеры
├── middleware/      # Middleware (auth, admin)
├── models/          # Модели данных
├── routes/          # Маршруты API
├── index.js         # Точка входа
└── package.json     # Зависимости
```

## Документация

Подробная документация по развертыванию: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Разработка

```bash
# Запуск в режиме разработки с hot-reload
npm run dev

# Или с Docker
docker-compose -f docker-compose.dev.yml up
```

## Лицензия

Проект для внутреннего использования.

