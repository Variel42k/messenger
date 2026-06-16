# Active Directory и LDAP — подключение и тестирование

Этот документ описывает:
- как подключить Messenger к Active Directory или LDAP
- как тестировать подключение к домену
- ограничения при подключении нескольких доменов и обходные пути
- подключение через OIDC (ADFS, Azure AD)
- пошаговое тестирование каждого сценария
- диагностику и решение типичных проблем

## Содержание

- [Обзор механизмов аутентификации](#обзор)
- [Вариант 1: LDAP / Active Directory](#вариант-1-ldap--active-directory)
  - [Принцип работы](#принцип-работы-ldap)
  - [Шаг 1: Включить LDAP](#шаг-1-включить-ldap-в-приложении)
  - [Шаг 2: Настроить через API](#шаг-2-настроить-ldap-через-admin-api)
  - [Шаг 3: Проверить подключение](#шаг-3-проверить-подключение)
  - [Шаг 4: Тест аутентификации](#шаг-4-тест-аутентификации-пользователя)
  - [Несколько доменов через LDAP](#несколько-доменов-через-ldap)
- [Вариант 2: OIDC (ADFS / Azure AD)](#вариант-2-oidc)
  - [OIDC через ADFS](#oidc-через-adfs-windows-server)
  - [OIDC через Azure AD](#oidc-через-azure-ad)
  - [OIDC через Keycloak с LDAP](#oidc-через-keycloak-с-ad-федерацией)
  - [Несколько доменов через OIDC](#несколько-доменов-через-oidc)
- [Полный тест-план](#полный-тест-план)
- [Диагностика](#диагностика)
- [Справка: DN и LDAP-атрибуты](#справка-dn-и-ldap-атрибуты)

---

## Обзор

| Механизм | Протокол | Провайдер | Multi-domain | Когда использовать |
|----------|----------|-----------|-------------|-------------------|
| Локальная БД | — | Встроенный | — | Всегда работает по умолчанию |
| LDAP direct | LDAP/LDAPS | AD, OpenLDAP | Через Global Catalog | Прямая интеграция с AD |
| OIDC | HTTPS/OpenID Connect | ADFS, Azure AD, Keycloak | С ограничениями | SSO, корпоративный IdP |

**Локальная аутентификация всегда активна** и не отключается. Даже при включённом LDAP или OIDC администраторы могут входить с локальным паролем.

---

## Вариант 1: LDAP / Active Directory

### Принцип работы LDAP

При входе пользователь вводит логин и пароль. Если LDAP включён:

1. Backend строит DN пользователя по шаблону (например, `CN=username,OU=Users,DC=company,DC=com`)
2. Пробует bind к LDAP-серверу с этим DN и паролем
3. Если bind успешен — пользователь аутентифицирован через AD
4. Если пользователь уже существует в локальной БД — сессия создаётся, иначе выдаётся ошибка

> **Важно:** LDAP в Messenger — это только проверка пароля. Управление пользователями (создание, роли) происходит через интерфейс самого Messenger, не через AD. При первом входе пользователь уже должен существовать в Messenger, созданный администратором или авто-provisioned через OIDC.

### Шаг 1: Включить LDAP в приложении

LDAP-функциональность включается флагом `app.ldap.enabled=true`. По умолчанию LDAP выключен.

**Вариант A**: переменная окружения в `.env`:

```dotenv
APP_LDAP_ENABLED=true
```

Убедитесь, что `application.yml` читает эту переменную:

```yaml
app:
  ldap:
    enabled: ${APP_LDAP_ENABLED:false}
```

Если переменная не прочитана, раскомментируйте секцию LDAP в `application.yml` вручную.

**Вариант B**: передать как аргумент JVM в `docker-compose.override.yml`:

```yaml
services:
  server:
    environment:
      JAVA_TOOL_OPTIONS: "-Dapp.ldap.enabled=true"
  worker:
    environment:
      JAVA_TOOL_OPTIONS: "-Dapp.ldap.enabled=true"
```

После изменения перезапустите backend:

```bash
docker compose restart server worker
# или через скрипт:
./scripts/messengerctl.sh restart
```

Проверить, что LDAP включён:

```bash
curl -s http://localhost:8080/api/admin/ldap-configuration-help | python3 -m json.tool
# Если получили JSON с инструкциями — LDAP включён
# Если 404 — LDAP не включён (проверьте переменную и перезапустите)
```

### Шаг 2: Настроить LDAP через Admin API

Все настройки LDAP управляются через REST API с токеном администратора.

**Получить токен admin:**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo "Token: $TOKEN"
```

**Посмотреть текущие настройки LDAP:**

```bash
curl -s http://localhost:8080/api/admin/ldap-settings \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Настроить LDAP для Windows Active Directory:**

```bash
curl -s -X POST http://localhost:8080/api/admin/ldap-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ldapUrl": "ldap://dc01.company.com:389",
    "baseDn": "DC=company,DC=com",
    "userDnPattern": "CN={0},OU=Users,DC=company,DC=com",
    "managerDn": "CN=ldap-bind,OU=ServiceAccounts,DC=company,DC=com",
    "managerPassword": "ServiceAccountPassword123!"
  }' | python3 -m json.tool
```

**Настроить LDAP для OpenLDAP / Samba:**

```bash
curl -s -X POST http://localhost:8080/api/admin/ldap-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ldapUrl": "ldap://ldap.company.com:389",
    "baseDn": "dc=company,dc=com",
    "userDnPattern": "uid={0},ou=people,dc=company,dc=com",
    "managerDn": "cn=admin,dc=company,dc=com",
    "managerPassword": "AdminPassword"
  }' | python3 -m json.tool
```

#### Параметры LDAP-настроек

| Параметр | Описание | Пример AD | Пример OpenLDAP |
|----------|----------|-----------|-----------------|
| `ldapUrl` | URL сервера | `ldap://dc01.company.com:389` | `ldap://ldap.company.com:389` |
| `baseDn` | Базовый DN для поиска | `DC=company,DC=com` | `dc=company,dc=com` |
| `userDnPattern` | Шаблон DN пользователя (`{0}` = логин) | `CN={0},OU=Users,DC=company,DC=com` | `uid={0},ou=people,dc=company,dc=com` |
| `managerDn` | DN сервисного аккаунта | `CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com` | `cn=admin,dc=company,dc=com` |
| `managerPassword` | Пароль сервисного аккаунта | `SecurePassword!` | `AdminPass` |

**Для LDAPS (шифрование):**

```bash
curl -s -X POST http://localhost:8080/api/admin/ldap-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ldapUrl": "ldaps://dc01.company.com:636",
    "baseDn": "DC=company,DC=com",
    "userDnPattern": "CN={0},OU=Users,DC=company,DC=com",
    "managerDn": "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com",
    "managerPassword": "SecurePassword!"
  }' | python3 -m json.tool
```

> LDAPS на порту 636 использует TLS. Убедитесь, что корпоративный CA-сертификат доверен JVM в контейнере. При необходимости добавьте его в `JAVA_TOOL_OPTIONS` или Java truststore.

### Шаг 3: Проверить подключение

**Тест соединения с LDAP-сервером:**

```bash
curl -s -X POST http://localhost:8080/api/admin/ldap-test-connection \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Ожидаемый ответ при успехе:

```json
{
  "success": true,
  "message": "Connection successful"
}
```

При ошибке:

```json
{
  "success": false,
  "message": "Connection failed: ..."
}
```

**Тест сетевой доступности (до включения LDAP в API):**

```bash
# Из хоста
nc -zv dc01.company.com 389    # LDAP
nc -zv dc01.company.com 636    # LDAPS
nc -zv dc01.company.com 3268   # Global Catalog (LDAP)
nc -zv dc01.company.com 3269   # Global Catalog (LDAPS)

# Из контейнера (если DC не в той же сети)
docker exec messenger-server nc -zv dc01.company.com 389
```

**Проверить LDAP вручную через ldapsearch:**

```bash
# Установить ldap-utils если нет
apt-get install -y ldap-utils 2>/dev/null || yum install -y openldap-clients 2>/dev/null

# Тест anonymous bind
ldapsearch -x -H ldap://dc01.company.com:389 \
  -b "DC=company,DC=com" \
  "(objectClass=person)" dn | head -20

# Тест bind от имени сервисного аккаунта
ldapsearch -x -H ldap://dc01.company.com:389 \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "ServiceAccountPassword" \
  -b "DC=company,DC=com" \
  "(sAMAccountName=testuser)" cn mail | head -30

# Поиск конкретного пользователя
ldapsearch -x -H ldap://dc01.company.com:389 \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "ServiceAccountPassword" \
  -b "OU=Users,DC=company,DC=com" \
  "(sAMAccountName=jsmith)" cn mail memberOf
```

### Шаг 4: Тест аутентификации пользователя

> Пользователь уже должен существовать в базе Messenger. Если нет — создайте его через UI или API.

```bash
# Аутентификация через API (LDAP будет использован автоматически)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"jsmith","password":"ADPassword123!"}' | python3 -m json.tool
```

При успехе вернётся `accessToken` и `refreshToken`.
При ошибке — HTTP 401 с описанием причины.

**Просмотр LDAP-конфигурации для справки:**

```bash
curl -s http://localhost:8080/api/admin/ldap-configuration-help \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Возвращает пошаговую справку по настройке для разных типов серверов.

---

### Несколько доменов через LDAP

**Ограничение:** Messenger поддерживает **одно LDAP-подключение** с одним URL и одним baseDN. Это ограничение текущей архитектуры `LdapService`.

#### Обходной путь 1: Active Directory Global Catalog

Global Catalog (GC) — специальный порт AD, содержащий частичные реплики объектов **всего леса** (всех доменов). Это позволяет искать пользователей из нескольких доменов через одно подключение.

```bash
# Порты Global Catalog:
# 3268 — LDAP (незашифрованный)
# 3269 — LDAPS (зашифрованный)

curl -s -X POST http://localhost:8080/api/admin/ldap-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ldapUrl": "ldap://dc01.company.com:3268",
    "baseDn": "DC=company,DC=com",
    "userDnPattern": "CN={0},OU=Users,DC=company,DC=com",
    "managerDn": "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com",
    "managerPassword": "SecurePassword!"
  }' | python3 -m json.tool
```

> **Особенности GC:**
> - Поиск работает по всему лесу (forest)
> - Содержит подмножество атрибутов (без некоторых специфичных атрибутов домена)
> - Нужен минимум один DC уровня forest root с ролью GC
> - Шаблон DN должен указывать на организационную единицу, общую для всех доменов

Проверка GC порта:

```bash
nc -zv dc01.company.com 3268

# Тест поиска через GC
ldapsearch -x -H ldap://dc01.company.com:3268 \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "Password" \
  -b "DC=company,DC=com" \
  "(sAMAccountName=*)" dn | head -20
```

#### Обходной путь 2: Keycloak как LDAP-агрегатор

Если требуются полноценные несколько доменов с разными лесами, разверните Keycloak как промежуточный IdP:

1. Keycloak подключается к нескольким AD через LDAP federation
2. Messenger подключается к Keycloak через OIDC (один провайдер)
3. Пользователи из обоих доменов проходят аутентификацию через Keycloak

Схема:

```
AD Forest A (DC=a.com)   ─┐
                           ├─► Keycloak ──► Messenger (OIDC)
AD Forest B (DC=b.com)   ─┘
```

Настройка описана в разделе [OIDC через Keycloak с AD федерацией](#oidc-через-keycloak-с-ad-федерацией).

#### Обходной путь 3: AD Trust и единый лес

Если оба домена находятся в доверительных отношениях (trust) в одном лесу AD, используйте baseDN уровня root домена и Global Catalog. Тогда одно LDAP-подключение покрывает оба домена.

---

## Вариант 2: OIDC

OIDC (OpenID Connect) — протокол единого входа (SSO). Пользователь перенаправляется на корпоративный IdP (ADFS, Azure AD, Keycloak), проходит аутентификацию там, и IdP возвращает токен в Messenger.

**Ограничение:** Messenger поддерживает **один OIDC-провайдер**. Это ограничение текущей архитектуры `OidcProviderService`.

### OIDC через ADFS (Windows Server)

ADFS (Active Directory Federation Services) — компонент Windows Server для SSO.

#### Предварительные требования

- ADFS развёрнут и доступен из сети, где работает Messenger
- Права на создание Application Groups в ADFS (локальный или доменный администратор ADFS)

#### Шаг 1: Настройка Application в ADFS

В ADFS Manager создайте новую Application Group:

1. **Server Manager → Tools → AD FS Management**
2. **Application Groups → Add Application Group**
3. Template: **Server application accessing a web API**
4. Укажите:
   - Name: `Messenger`
   - Client ID: сгенерировать (сохраните — это `clientId`)
   - Redirect URI: `https://chat.company.com/api/auth/oidc/callback`
5. Разрешения: `openid`, `profile`, `email`
6. На экране Client Secret выберите **Generate a shared secret** (сохраните — это `clientSecret`)
7. В Web API → Add Identifier: `https://messenger-api` (произвольный URI)
8. В Web API → Access Control Policy: **Permit specific group** → ваша AD группа пользователей

#### Шаг 2: Получить OIDC endpoints ADFS

ADFS публикует метаданные OpenID Connect по URL:

```
https://adfs.company.com/adfs/.well-known/openid-configuration
```

Проверьте доступность:

```bash
curl -s https://adfs.company.com/adfs/.well-known/openid-configuration | python3 -m json.tool
```

Из ответа выпишите значения для настройки:

| Поле в метаданных | Значение для Messenger |
|-------------------|----------------------|
| `authorization_endpoint` | `authorizationUri` |
| `token_endpoint` | `tokenUri` |
| `userinfo_endpoint` | `userInfoUri` |
| `jwks_uri` | `jwksUri` |
| `issuer` | `issuerUri` |

#### Шаг 3: Настроить OIDC в Messenger

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

curl -s -X PUT http://localhost:8080/api/admin/oidc/provider \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerName": "adfs",
    "displayName": "Вход через корпоративный аккаунт",
    "enabled": true,
    "issuerUri": "https://adfs.company.com/adfs",
    "authorizationUri": "https://adfs.company.com/adfs/oauth2/authorize",
    "tokenUri": "https://adfs.company.com/adfs/oauth2/token",
    "userInfoUri": "https://adfs.company.com/adfs/userinfo",
    "jwksUri": "https://adfs.company.com/adfs/discovery/keys",
    "clientId": "YOUR_CLIENT_ID_FROM_ADFS",
    "clientSecret": "YOUR_CLIENT_SECRET_FROM_ADFS",
    "redirectUri": "https://chat.company.com/api/auth/oidc/callback",
    "scopes": "openid profile email",
    "autoProvisionUsers": true,
    "defaultRole": "USER"
  }' | python3 -m json.tool
```

#### Шаг 4: Проверить конфигурацию

```bash
# Получить публичные настройки провайдера (видны без авторизации)
curl -s http://localhost:8080/api/auth/oidc/provider | python3 -m json.tool

# Получить URL для авторизации
curl -s "http://localhost:8080/api/auth/oidc/authorization-url?redirectUri=https://chat.company.com/auth/callback" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Ожидаемый ответ `authorization-url`:

```json
{
  "url": "https://adfs.company.com/adfs/oauth2/authorize?client_id=...&response_type=code&scope=openid+profile+email&redirect_uri=...&state=..."
}
```

Откройте этот URL в браузере — должна открыться страница входа ADFS.

#### Шаг 5: Тест полного OIDC-потока

1. Откройте `https://chat.company.com` — должна появиться кнопка SSO
2. Нажмите — браузер перенаправит на ADFS
3. Введите корпоративные учётные данные
4. ADFS вернёт вас в Messenger
5. Messenger создаст пользователя (если `autoProvisionUsers: true`) или выдаст ошибку, если пользователь не найден

---

### OIDC через Azure AD

Используйте, если пользователи хранятся в Azure Active Directory (Microsoft Entra ID).

#### Шаг 1: Регистрация приложения в Azure Portal

1. Перейдите в **Azure Portal → Azure Active Directory → App registrations → New registration**
2. Имя: `Messenger`
3. Supported account types: **Accounts in this organizational directory only (single tenant)** или **Multitenant** (см. [Несколько доменов через OIDC](#несколько-доменов-через-oidc))
4. Redirect URI: `https://chat.company.com/api/auth/oidc/callback`
5. Нажмите **Register**
6. Запишите **Application (client) ID** — это `clientId`
7. Запишите **Directory (tenant) ID** — нужен для endpoint URL

**Создать Client Secret:**

В меню слева: **Certificates & secrets → New client secret** → задайте срок действия → **Add**. Сохраните значение секрета — это `clientSecret`.

**Настроить API permissions:**

В меню слева: **API permissions → Add a permission → Microsoft Graph → Delegated permissions**:
- `openid`
- `profile`
- `email`
- `User.Read`

Нажмите **Grant admin consent**.

#### Шаг 2: Получить OIDC endpoints Azure AD

Замените `{tenant-id}` на ваш Tenant ID:

```bash
TENANT_ID="your-tenant-id-guid"
curl -s "https://login.microsoftonline.com/${TENANT_ID}/v2.0/.well-known/openid-configuration" | python3 -m json.tool
```

Стандартные endpoint URL для Azure AD:

| Параметр | URL |
|----------|-----|
| `issuerUri` | `https://login.microsoftonline.com/{tenant-id}/v2.0` |
| `authorizationUri` | `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize` |
| `tokenUri` | `https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token` |
| `userInfoUri` | `https://graph.microsoft.com/oidc/userinfo` |
| `jwksUri` | `https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys` |

#### Шаг 3: Настроить OIDC в Messenger

```bash
TENANT_ID="your-tenant-id-guid"
CLIENT_ID="your-app-client-id"
CLIENT_SECRET="your-client-secret"

curl -s -X PUT http://localhost:8080/api/admin/oidc/provider \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"providerName\": \"azure-ad\",
    \"displayName\": \"Войти через Microsoft\",
    \"enabled\": true,
    \"issuerUri\": \"https://login.microsoftonline.com/${TENANT_ID}/v2.0\",
    \"authorizationUri\": \"https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize\",
    \"tokenUri\": \"https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token\",
    \"userInfoUri\": \"https://graph.microsoft.com/oidc/userinfo\",
    \"jwksUri\": \"https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys\",
    \"clientId\": \"${CLIENT_ID}\",
    \"clientSecret\": \"${CLIENT_SECRET}\",
    \"redirectUri\": \"https://chat.company.com/api/auth/oidc/callback\",
    \"scopes\": \"openid profile email\",
    \"autoProvisionUsers\": true,
    \"defaultRole\": \"USER\"
  }" | python3 -m json.tool
```

#### Шаг 4: Проверить

```bash
# Должен вернуть enabled: true и displayName
curl -s http://localhost:8080/api/auth/oidc/provider | python3 -m json.tool

# Должен вернуть URL авторизации Azure AD
curl -s "http://localhost:8080/api/auth/oidc/authorization-url" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

### OIDC через Keycloak с AD федерацией

Keycloak позволяет объединить несколько источников пользователей (LDAP federation) и предоставить их через единый OIDC endpoint.

#### Настройка Keycloak (кратко)

1. Установите Keycloak (Docker или systemd)
2. Создайте Realm `company`
3. В Realm → **User Federation → Add provider → LDAP**:
   - Connection URL: `ldap://dc01.company.com:389`
   - Bind DN: `CN=svc-keycloak,OU=ServiceAccounts,DC=company,DC=com`
   - Users DN: `OU=Users,DC=company,DC=com`
   - Повторите для второго домена
4. Создайте Client: **Clients → Create → Client ID: messenger**
   - Root URL: `https://chat.company.com`
   - Redirect URIs: `https://chat.company.com/api/auth/oidc/callback`
   - Client Secret: создайте и сохраните

#### Настройка в Messenger

```bash
KEYCLOAK_URL="https://keycloak.company.com"
REALM="company"

curl -s -X PUT http://localhost:8080/api/admin/oidc/provider \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"providerName\": \"keycloak\",
    \"displayName\": \"Корпоративный вход\",
    \"enabled\": true,
    \"issuerUri\": \"${KEYCLOAK_URL}/realms/${REALM}\",
    \"authorizationUri\": \"${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth\",
    \"tokenUri\": \"${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token\",
    \"userInfoUri\": \"${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo\",
    \"jwksUri\": \"${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs\",
    \"clientId\": \"messenger\",
    \"clientSecret\": \"YOUR_KEYCLOAK_CLIENT_SECRET\",
    \"redirectUri\": \"https://chat.company.com/api/auth/oidc/callback\",
    \"scopes\": \"openid profile email\",
    \"autoProvisionUsers\": true,
    \"defaultRole\": \"USER\"
  }" | python3 -m json.tool
```

---

### Несколько доменов через OIDC

**Текущее ограничение:** Messenger хранит **одну** OIDC-конфигурацию. Одновременная работа с несколькими провайдерами не поддерживается.

#### Обходной путь 1: Azure AD Multitenant

Если у вас несколько Azure AD тенантов (организаций), настройте приложение как multitenant:

1. При регистрации выберите **Accounts in any organizational directory (Multitenant)**
2. Используйте endpoint с `common` вместо Tenant ID:

```bash
curl -s -X PUT http://localhost:8080/api/admin/oidc/provider \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "providerName": "azure-ad-multi",
    "displayName": "Войти через Microsoft",
    "enabled": true,
    "issuerUri": "https://login.microsoftonline.com/common/v2.0",
    "authorizationUri": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "tokenUri": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "userInfoUri": "https://graph.microsoft.com/oidc/userinfo",
    "jwksUri": "https://login.microsoftonline.com/common/discovery/v2.0/keys",
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "redirectUri": "https://chat.company.com/api/auth/oidc/callback",
    "scopes": "openid profile email",
    "autoProvisionUsers": true,
    "defaultRole": "USER"
  }' | python3 -m json.tool
```

> Multitenant позволяет входить пользователям из **любого** Azure AD. Ограничьте доступ через Azure AD → Enterprise Applications → условный доступ или через проверку `hd` claim.

#### Обходной путь 2: ADFS с несколькими доменами леса

ADFS может выдавать токены для пользователей из всего леса AD (включая дочерние домены). Настройте ADFS как единую точку входа для всего леса.

#### Обходной путь 3: Keycloak (рекомендуется)

Keycloak поддерживает множество User Federation источников (несколько AD лесов) и предоставляет единый OIDC endpoint. Это наиболее гибкое решение для multi-domain.

```
AD Domain A ─┐
AD Domain B ─┤→ Keycloak (единый OIDC провайдер) ─→ Messenger
AD Domain C ─┘
```

---

## Полный тест-план

### Тест-план 1: LDAP / Active Directory

```bash
#!/usr/bin/env bash
# Скрипт полного тестирования LDAP/AD подключения

BASE_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin123"
LDAP_URL="ldap://dc01.company.com:389"
MANAGER_DN="CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com"
MANAGER_PASS="ServiceAccountPassword"
TEST_USER="jsmith"
TEST_PASS="UserADPassword"

echo "=== Тест 1: Получение admin токена ==="
TOKEN=$(curl -sf -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo "Token получен: ${TOKEN:0:20}..."

echo ""
echo "=== Тест 2: Сетевой тест (LDAP порт) ==="
nc -zv dc01.company.com 389 && echo "PASS: LDAP порт 389 доступен" || echo "FAIL: LDAP порт 389 недоступен"

echo ""
echo "=== Тест 3: Настройка LDAP ==="
RESULT=$(curl -sf -X POST "$BASE_URL/api/admin/ldap-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"ldapUrl\": \"$LDAP_URL\",
    \"baseDn\": \"DC=company,DC=com\",
    \"userDnPattern\": \"CN={0},OU=Users,DC=company,DC=com\",
    \"managerDn\": \"$MANAGER_DN\",
    \"managerPassword\": \"$MANAGER_PASS\"
  }")
echo "Ответ API: $RESULT"

echo ""
echo "=== Тест 4: Тест подключения к LDAP ==="
CONN_RESULT=$(curl -sf -X POST "$BASE_URL/api/admin/ldap-test-connection" \
  -H "Authorization: Bearer $TOKEN")
echo "Результат: $CONN_RESULT"
echo "$CONN_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if d.get('success') else 'FAIL')"

echo ""
echo "=== Тест 5: Аутентификация тестового пользователя через LDAP ==="
AUTH_RESULT=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}")
echo "Статус: $(echo "$AUTH_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS: token получен' if 'accessToken' in d else 'FAIL: ' + str(d))")"

echo ""
echo "=== Тест 6: LDAP справка ==="
curl -sf "$BASE_URL/api/admin/ldap-configuration-help" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### Тест-план 2: OIDC

```bash
#!/usr/bin/env bash
# Скрипт тестирования OIDC-подключения

BASE_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="admin123"

echo "=== Тест 1: Получение admin токена ==="
TOKEN=$(curl -sf -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo "Token получен"

echo ""
echo "=== Тест 2: Доступность IdP metadata endpoint ==="
# Замените на ваш ADFS/Azure URL
IDP_METADATA="https://adfs.company.com/adfs/.well-known/openid-configuration"
curl -sf "$IDP_METADATA" > /dev/null && echo "PASS: IdP metadata доступны" || echo "FAIL: IdP metadata недоступны"

echo ""
echo "=== Тест 3: Текущая OIDC конфигурация (admin) ==="
curl -sf "$BASE_URL/api/admin/oidc/provider" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo "=== Тест 4: Публичная информация о провайдере ==="
curl -sf "$BASE_URL/api/auth/oidc/provider" | python3 -m json.tool

echo ""
echo "=== Тест 5: Генерация authorization URL ==="
AUTH_URL=$(curl -sf "$BASE_URL/api/auth/oidc/authorization-url" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))")
if [[ -n "$AUTH_URL" ]]; then
  echo "PASS: Authorization URL сгенерирован"
  echo "URL: $AUTH_URL"
  echo ""
  echo "Откройте этот URL в браузере для полного теста авторизации."
else
  echo "FAIL: Authorization URL не получен"
fi
```

### Тест-план 3: Multi-domain (Global Catalog)

```bash
#!/usr/bin/env bash
# Тест подключения через AD Global Catalog (несколько доменов)

GC_HOST="dc-root.company.com"

echo "=== Тест 1: Доступность Global Catalog портов ==="
nc -zv "$GC_HOST" 3268 && echo "PASS: GC LDAP (3268)" || echo "FAIL: GC LDAP (3268)"
nc -zv "$GC_HOST" 3269 && echo "PASS: GC LDAPS (3269)" || echo "FAIL: GC LDAPS (3269)"

echo ""
echo "=== Тест 2: Поиск пользователей из домена A через GC ==="
ldapsearch -x -H "ldap://$GC_HOST:3268" \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "Password" \
  -b "DC=company,DC=com" \
  "(sAMAccountName=user-from-domain-a)" dn

echo ""
echo "=== Тест 3: Поиск пользователей из домена B через GC ==="
ldapsearch -x -H "ldap://$GC_HOST:3268" \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "Password" \
  -b "DC=company,DC=com" \
  "(sAMAccountName=user-from-domain-b)" dn

echo ""
echo "=== Тест 4: Общий поиск по лесу ==="
ldapsearch -x -H "ldap://$GC_HOST:3268" \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "Password" \
  -b "DC=company,DC=com" \
  "(objectClass=person)" dn | grep -c "dn:" | xargs echo "Найдено пользователей:"
```

---

## Диагностика

### LDAP: типичные ошибки

#### `Connection failed: Connection refused`

Причина: LDAP-сервер не доступен из контейнера.

Действия:
```bash
# Проверить доступность с хоста
nc -zv dc01.company.com 389

# Проверить доступность из контейнера
docker exec messenger-server nc -zv dc01.company.com 389

# Если контейнер в изолированной сети — добавьте DNS/hosts
# В docker-compose.override.yml:
# extra_hosts:
#   - "dc01.company.com:192.168.1.10"
```

#### `Invalid credentials` при тесте подключения

Причина: неверные `managerDn` или `managerPassword`.

Действия:
```bash
# Проверьте DN через ldapsearch
ldapsearch -x -H ldap://dc01.company.com:389 \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "Password" \
  -b "" -s base "(objectClass=*)"

# Распространённая ошибка: неверный формат DN
# AD: используйте CN=... DC=...
# OpenLDAP: используйте cn=... dc=...
```

#### Пользователь не аутентифицируется, хотя тест подключения проходит

Причина: шаблон DN не соответствует реальному расположению пользователя в AD.

Действия:
```bash
# Найти точный DN пользователя
ldapsearch -x -H ldap://dc01.company.com:389 \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "Password" \
  -b "DC=company,DC=com" \
  "(sAMAccountName=jsmith)" dn

# Вывод покажет точный DN: CN=John Smith,OU=Marketing,DC=company,DC=com
# Обновите userDnPattern чтобы соответствовал реальному пути
```

Если пользователи в разных OU, можно использовать UPN (User Principal Name):

```json
{
  "userDnPattern": "CN={0},OU=Users,DC=company,DC=com"
}
```

Или попробуйте разные OU: `OU=Marketing`, `OU=IT`, `OU=Sales`.

#### `LDAP: error code 49 - Invalid Credentials` при аутентификации пользователя

Причина: неверный пароль или пользователь заблокирован в AD.

Проверьте:
```bash
# Проверить статус аккаунта в AD (если есть AD-утилиты)
net user jsmith /domain

# Через ldapsearch — проверить accountExpires и lockoutTime
ldapsearch -x -H ldap://dc01.company.com:389 \
  -D "CN=svc-ldap,OU=ServiceAccounts,DC=company,DC=com" \
  -w "Password" \
  -b "DC=company,DC=com" \
  "(sAMAccountName=jsmith)" accountExpires lockoutTime userAccountControl
```

#### LDAPS: ошибки SSL/TLS

```bash
# Проверить сертификат DC
openssl s_client -connect dc01.company.com:636 -showcerts

# Если корпоративный CA — импортировать в Java truststore контейнера
# В docker-compose.override.yml:
# volumes:
#   - /path/to/corporate-ca.crt:/usr/local/share/ca-certificates/corporate-ca.crt
# environment:
#   JAVA_TOOL_OPTIONS: "-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts"
```

### OIDC: типичные ошибки

#### `Authorization URL не генерируется`

Причина: OIDC не включён или конфигурация неполная.

```bash
# Проверить конфигурацию
curl -s http://localhost:8080/api/admin/oidc/provider \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# enabled должен быть true, все URI должны быть заполнены
```

#### `Invalid redirect_uri`

Причина: redirect URI в настройках Messenger не совпадает с тем, что зарегистрировано в ADFS/Azure AD.

Проверьте:
- В Messenger: поле `redirectUri`
- В ADFS: Redirect URI в Application Group
- В Azure AD: Redirect URI в App Registration

Они должны совпадать **точно**, включая trailing slash.

#### `state parameter missing or expired`

Причина: слишком долгое время между редиректом на IdP и возвратом. TTL состояния — 600 секунд.

Убедитесь, что время сервера синхронизировано с NTP.

#### `autoProvisionUsers: false` — пользователь не найден

Если `autoProvisionUsers: false`, пользователь должен существовать в Messenger до входа через OIDC. Создайте пользователя через Admin UI или включите `autoProvisionUsers: true`.

### Просмотр логов аутентификации

```bash
# Логи backend во время попытки входа
docker compose logs --tail 50 server | grep -i "ldap\|oidc\|auth\|login"

# Или через скрипт
./scripts/messengerctl.sh logs --service server --tail 100
```

---

## Справка: DN и LDAP-атрибуты

### Структура DN для Windows AD

```
CN=John Smith,OU=Engineering,OU=Users,DC=company,DC=com
│            │                        │
└── Имя      └── Организационная      └── Домен
    объекта       единица (может быть       company.com
    (CN = Common   вложенной)
     Name)
```

Компоненты домена `company.com`:
- `DC=company,DC=com`

Компоненты домена `east.company.com`:
- `DC=east,DC=company,DC=com`

### Типичные OU в AD

| OU | Назначение |
|----|-----------|
| `OU=Users` | Пользователи |
| `OU=Computers` | Компьютеры |
| `OU=ServiceAccounts` | Сервисные аккаунты |
| `OU=Groups` | Группы |
| `OU=Domain Controllers` | Контроллеры домена |

### Важные LDAP-атрибуты AD

| Атрибут | Описание | Пример |
|---------|----------|--------|
| `sAMAccountName` | Имя входа (logon name) | `jsmith` |
| `userPrincipalName` | UPN (email-формат) | `jsmith@company.com` |
| `cn` | Common Name (отображаемое имя) | `John Smith` |
| `mail` | Email | `j.smith@company.com` |
| `memberOf` | Группы пользователя | DN групп |
| `userAccountControl` | Флаги аккаунта | `512` = нормальный |
| `lockoutTime` | Время блокировки | `0` = не заблокирован |
| `accountExpires` | Срок действия | `0` = бессрочно |

### LDAP URL форматы

| Сценарий | URL | Порт |
|----------|-----|------|
| LDAP (без шифрования) | `ldap://dc01.company.com:389` | 389 |
| LDAPS (TLS) | `ldaps://dc01.company.com:636` | 636 |
| Global Catalog (LDAP) | `ldap://dc01.company.com:3268` | 3268 |
| Global Catalog (LDAPS) | `ldaps://dc01.company.com:3269` | 3269 |

### Сервисный аккаунт для LDAP bind

Создайте в AD отдельный аккаунт только для LDAP-чтения:

```powershell
# PowerShell на DC (пример)
New-ADUser `
  -Name "svc-messenger-ldap" `
  -SamAccountName "svc-messenger-ldap" `
  -UserPrincipalName "svc-messenger-ldap@company.com" `
  -Path "OU=ServiceAccounts,DC=company,DC=com" `
  -AccountPassword (ConvertTo-SecureString "SecurePassword!" -AsPlainText -Force) `
  -Enabled $true `
  -PasswordNeverExpires $true `
  -CannotChangePassword $true

# Выдать права на чтение нужных OU
# (Delegation of Control Wizard в ADUC или через PowerShell)
```

Минимальные права сервисного аккаунта:
- Read (чтение) на OU с пользователями
- Не нужны права на запись
- Не добавляйте в Domain Admins или Enterprise Admins
