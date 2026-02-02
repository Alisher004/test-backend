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
   # Используйте скрипт развертывания
   ./deploy.sh
   
   # Или вручную
   docker-compose up -d --build
   ```

3. **Проверьте работу:**
   ```bash
   curl http://localhost:5001/api/test
   ```

### Без Docker

1. Установите MongoDB и запустите сервис
2. Установите зависимости: `npm install`
3. Создайте `.env` файл с настройками БД
4. Запустите: `npm start` или `npm run dev`

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
PORT=5001
NODE_ENV=production

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/okurmen_test
# Для Docker используйте: mongodb://mongodb:27017/okurmen_test
# Для production с аутентификацией: mongodb://username:password@host:27017/database?authSource=admin

JWT_SECRET=your-very-secure-secret-key-min-32-characters

# Опционально: разрешенные CORS origins
# "*" или "all" - разрешить все origins (по умолчанию)
# Или конкретные домены через запятую: https://domain1.com,https://domain2.com
ALLOWED_ORIGINS=*
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

## Разработка

```bash
# Запуск в режиме разработки с hot-reload
npm run dev

# Или с Docker
docker-compose up
```

## Лицензия

Проект для внутреннего использования.

