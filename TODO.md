# TODO — Проект Messenger

> Обновлено: 2026-02-27

## 🔴 Высокий приоритет

- [ ] **MinIO интеграция** — FileService сейчас использует локальное хранилище, нужно перевести на MinIO S3 API
- [ ] **HTTPS/TLS** — включить TLS для production-развёртывания
- [ ] **Rate Limiting** — добавить ограничение запросов (Spring Cloud Gateway или фильтр)

## 🟠 Средний приоритет

- [ ] **JWT Roles в токене** — добавить роль (USER/ADMIN) в JWT payload для оптимизации (не ходить в БД каждый раз)
- [ ] **SecurityPoliciesController** — реализовать бизнес-логику (сейчас заглушки)
- [ ] **Unit-тесты** — написать тесты для сервисов (UserService, ChatService, MessageService)
- [ ] **Integration-тесты** — написать тесты контроллеров (MockMvc)
- [ ] **CI/CD** — настроить GitHub Actions: build → test → docker push
- [ ] **open-in-view** — установить `spring.jpa.open-in-view: false` (предупреждение при старте)

## 🟡 Низкий приоритет

- [ ] **Пагинация** — добавить `?page=&size=` для GET /api/messages/chat/{chatId}
- [ ] **Статус сообщений** — реализовать DELIVERED/READ через WebSocket
- [ ] **Онлайн-статус** — реализовать через Redis pub/sub
- [ ] **Push-уведомления** — WebSocket + уведомления при офлайне
- [ ] **Аватары** — загрузка аватаров пользователей и чатов в MinIO
- [x] **2FA** — двухфакторная аутентификация (TOTP)
- [ ] **Поиск** — полнотекстовый поиск по сообщениям (PostgreSQL FTS)

## 🟢 Идеи на будущее

- [ ] Mobile-клиент (React Native)
- [ ] Partitioning таблицы messages по дате
- [ ] WebSocket кластеризация через Redis pub/sub
- [ ] Prometheus + Grafana мониторинг
- [ ] ELK Stack для централизованного логирования
- [ ] Голосовые/видео-звонки (WebRTC)
- [ ] Реакции на cообщения (emoji)
- [ ] Пересылка сообщений
- [ ] Закреплённые сообщения

## ✅ Выполнено (аудит 2026-02-27)

- [x] IDOR-защита (userId из JWT)
- [x] Path Traversal защита
- [x] DTO с @Valid валидацией
- [x] GlobalExceptionHandler (400)
- [x] @Transactional
- [x] SLF4J Logger
- [x] Constructor injection
- [x] CORS/WS origins из конфига
- [x] ddl-auto: validate
- [x] .env для кредов
- [x] Swagger в permitAll
- [x] Удаление reactor-test
- [x] Актуализация документации
