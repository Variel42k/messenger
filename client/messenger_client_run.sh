#!/bin/bash

# Проверяем наличие Java 17 или выше
if ! command -v java &> /dev/null; then
    echo "Java не найдена. Установите Java 17 или выше."
    exit 1
fi

# Получаем версию Java
JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)

# Извлекаем главный номер версии
MAJOR_VERSION=$(echo "$JAVA_VERSION" | cut -d'.' -f1)

# Проверяем, что версия Java 17 или выше
if [ "$MAJOR_VERSION" -lt 17 ]; then
    echo "Требуется Java 17 или выше. Установленная версия: $JAVA_VERSION"
    exit 1
fi

# Запускаем приложение
echo "Запуск клиента мессенджера..."
java -jar target/messenger-client-0.0.1-SNAPSHOT.jar &

echo "Клиент запущен!"