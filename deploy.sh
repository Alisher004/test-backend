#!/bin/bash

# Скрипт для развертывания приложения

set -e

echo "🚀 Начало развертывания Okurmen Test Backend..."

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден!"
    echo "📝 Создайте файл .env на основе .env.example"
    echo "   cp .env.example .env"
    echo "   Затем отредактируйте .env и установите необходимые значения"
    exit 1
fi

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker для продолжения."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose для продолжения."
    exit 1
fi

# Выбор режима развертывания
MODE=${1:-production}

if [ "$MODE" = "dev" ]; then
    echo "🔧 Режим разработки"
    COMPOSE_FILE="docker-compose.dev.yml"
else
    echo "🏭 Режим продакшена"
    COMPOSE_FILE="docker-compose.yml"
fi

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose -f $COMPOSE_FILE down

# Сборка и запуск
echo "🔨 Сборка образов..."
docker-compose -f $COMPOSE_FILE build

echo "▶️  Запуск контейнеров..."
docker-compose -f $COMPOSE_FILE up -d

# Ожидание готовности сервисов
echo "⏳ Ожидание готовности сервисов..."
sleep 5

# Проверка статуса
echo "📊 Статус контейнеров:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "✅ Развертывание завершено!"
echo ""
echo "📡 API доступен по адресу: http://localhost:5001"
echo "🧪 Тестовый endpoint: http://localhost:5001/api/test"
echo ""
echo "📋 Полезные команды:"
echo "   Просмотр логов: docker-compose -f $COMPOSE_FILE logs -f"
echo "   Остановка: docker-compose -f $COMPOSE_FILE down"
echo "   Перезапуск: docker-compose -f $COMPOSE_FILE restart"
echo ""

