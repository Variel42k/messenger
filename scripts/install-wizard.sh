#!/usr/bin/env bash
#
# Messenger Installation Wizard
# Interactively configures and launches Messenger for any deployment variant.
#
# Usage:
#   bash scripts/install-wizard.sh              # full interactive mode
#   bash scripts/install-wizard.sh --quick      # dev mode, minimal prompts
#   bash scripts/install-wizard.sh --help
#
# Requirements: bash 4+, openssl, git, docker OR podman OR helm+kubectl
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CTL="$SCRIPT_DIR/messengerctl.sh"

# ─── terminal colors ───────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m'
  B='\033[0;34m' C='\033[0;36m' W='\033[1m' N='\033[0m'
else
  R='' G='' Y='' B='' C='' W='' N=''
fi

h()    { printf "\n${W}━━━ %s ━━━${N}\n" "$*"; }
sec()  { printf "\n${C}▸ %s${N}\n"        "$*"; }
ok()   { printf "${G}✓${N} %s\n"          "$*"; }
warn() { printf "${Y}⚠${N}  %s\n"         "$*"; }
err()  { printf "${R}✗${N}  %s\n"         "$*" >&2; }
info() { printf "  %s\n"                  "$*"; }
blank(){ printf "\n"; }

# ─── user input helpers ────────────────────────────────────────────────────────

# yn "Question?" [default=y]  — returns 0 (true) for yes, 1 (false) for no
yn() {
  local q="$1" def="${2:-y}" ans hint
  [[ "$def" == "y" ]] && hint="${G}Y${N}/n" || hint="y/${G}N${N}"
  printf "%s [%b]: " "$q" "$hint"
  read -r ans </dev/tty; ans="${ans:-$def}"
  [[ "$ans" =~ ^[Yy] ]]
}

# choice VAR "Prompt" "opt1" "opt2" ...  — sets VAR to the chosen option string
choice() {
  local __var="$1" __prompt="$2"; shift 2
  local __opts=("$@") __i=1 __ans
  blank; printf "%s\n" "$__prompt"
  for __o in "${__opts[@]}"; do
    printf "  ${C}%d)${N} %s\n" "$__i" "$__o"; ((__i++))
  done
  while true; do
    printf "Выбор [1-%d]: " "${#__opts[@]}"
    read -r __ans </dev/tty
    if [[ "$__ans" =~ ^[0-9]+$ ]] && (( __ans >= 1 && __ans <= ${#__opts[@]} )); then
      printf -v "$__var" '%s' "${__opts[$((__ans-1))]}"
      return 0
    fi
    err "Введите число от 1 до ${#__opts[@]}"
  done
}

# ask VAR "Prompt" [default]  — sets VAR; requires non-empty unless default given
ask() {
  local __var="$1" __prompt="$2" __def="${3:-}" __val __hint
  [[ -n "$__def" ]] && __hint=" [${W}${__def}${N}]" || __hint=""
  while true; do
    printf "%s%b: " "$__prompt" "$__hint"
    read -r __val </dev/tty; __val="${__val:-$__def}"
    if [[ -n "$__val" ]]; then
      printf -v "$__var" '%s' "$__val"; return 0
    fi
    err "Значение не может быть пустым"
  done
}

# ask_secret VAR "Prompt" — reads password without echo
ask_secret() {
  local __var="$1" __prompt="$2" __val
  printf "%s: " "$__prompt"
  read -rs __val </dev/tty; echo
  printf -v "$__var" '%s' "$__val"
}

gen_secret() {
  openssl rand -base64 48 2>/dev/null | tr -d '\n/+=' | head -c 64
}

need_cmd() {
  command -v "$1" &>/dev/null || { err "Команда не найдена: $1. Установите её и повторите."; return 1; }
}

# ─── wizard state ──────────────────────────────────────────────────────────────
QUICK_MODE=false
RUNTIME=""           # docker | podman | kubernetes
PROFILE=""           # dev | production
STORAGE_MODE=""      # s3-local | s3-external | disk-volume | disk-host | disk-device
STORAGE_HOST_PATH="" # for disk-host and disk-device
STORAGE_DEVICE=""    # for disk-device
STORAGE_DEVICE_FS="ext4"
S3_ENDPOINT=""
S3_KEY=""
S3_SECRET=""
S3_BUCKET="messenger-files"
S3_REGION="us-east-1"
S3_PATH_STYLE="true"
DOMAIN=""
CORS_ORIGINS=""
WS_ORIGINS=""
MAIL_MODE=""         # mailhog | smtp | skip
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
POSTGRES_PASSWORD=""
JWT_SECRET=""
HELM_NAMESPACE="messenger"
HELM_RELEASE="messenger"
HELM_VALUES=""

# ─── help ─────────────────────────────────────────────────────────────────────
show_help() {
  cat <<'EOF'
Messenger Installation Wizard — интерактивная настройка развёртывания

Usage:
  bash scripts/install-wizard.sh           # полный интерактивный режим
  bash scripts/install-wizard.sh --quick   # dev-режим с минимумом вопросов
  bash scripts/install-wizard.sh --help    # эта справка

Мастер настроит:
  • Runtime: Docker Compose / Podman Compose / Kubernetes (Helm)
  • Профиль: dev (LocalStack, MailHog) или production (реальные сервисы)
  • Хранилище файлов: S3/MinIO, Docker volume, host-директория, отдельный диск
  • Сеть: домен, CORS-origins
  • Email: MailHog (dev) или SMTP
  • Секреты: автогенерация JWT_SECRET и пароля БД

Результат: записанный .env, возможно docker-compose.override.yml,
           и запуск messengerctl.sh install.

После установки настройте LDAP/AD или OIDC через Admin API.
Подробности: docs/AD_LDAP_TESTING.md
EOF
}

# ─── step 0: parse args ───────────────────────────────────────────────────────
parse_args() {
  for arg in "$@"; do
    case "$arg" in
      --quick) QUICK_MODE=true ;;
      --help|-h) show_help; exit 0 ;;
      *) warn "Неизвестный аргумент: $arg" ;;
    esac
  done
}

# ─── step 1: welcome ──────────────────────────────────────────────────────────
step_welcome() {
  clear 2>/dev/null || true
  printf "${W}"
  cat <<'BANNER'
╔═══════════════════════════════════════════════════════════════╗
║            Messenger — Мастер установки                       ║
║  Self-hosted мессенджер для команд и организаций              ║
╚═══════════════════════════════════════════════════════════════╝
BANNER
  printf "${N}\n"
  info "Мастер проведёт вас через настройку и запуск Messenger."
  info "Нажмите Ctrl+C в любой момент для отмены."
  blank
  if $QUICK_MODE; then
    ok "Режим --quick: будет настроена локальная dev-установка с минимумом вопросов."
    blank
    return
  fi
  printf "Нажмите Enter для продолжения..."
  read -r </dev/tty || true
}

# ─── step 2: prerequisites ────────────────────────────────────────────────────
step_prerequisites() {
  h "Проверка зависимостей"
  need_cmd openssl
  need_cmd git
  local docker_ok=false podman_ok=false helm_ok=false
  command -v docker &>/dev/null && docker_ok=true && ok "Docker найден: $(docker --version 2>/dev/null | head -1)"
  command -v podman &>/dev/null && podman_ok=true && ok "Podman найден: $(podman --version 2>/dev/null | head -1)"
  command -v helm   &>/dev/null && helm_ok=true   && ok "Helm найден: $(helm version --short 2>/dev/null)"
  if ! $docker_ok && ! $podman_ok && ! $helm_ok; then
    err "Не найден ни Docker, ни Podman, ни Helm."
    err "Установите нужный runtime и повторите."
    exit 1
  fi
}

# ─── step 3: runtime ──────────────────────────────────────────────────────────
step_runtime() {
  if $QUICK_MODE; then
    RUNTIME="docker"; ok "Runtime: docker (quick mode)"; return
  fi

  h "Шаг 1/6 — Runtime"
  blank
  printf "  ${W}1) Docker Compose${N}   — рекомендуется; один сервер с Docker\n"
  printf "     Когда использовать: большинство случаев, знакомая экосистема.\n\n"
  printf "  ${W}2) Podman Compose${N}   — rootless-альтернатива Docker\n"
  printf "     Когда использовать: RHEL/Rocky/Fedora, запрет root-демонов.\n\n"
  printf "  ${W}3) Kubernetes/Helm${N}  — кластерное развёртывание\n"
  printf "     Когда использовать: HA, несколько узлов, CI/CD pipeline.\n\n"
  local __ch
  while true; do
    printf "Выбор [1]: "; read -r __ch </dev/tty; __ch="${__ch:-1}"
    case "$__ch" in
      1) RUNTIME="docker";     break ;;
      2) RUNTIME="podman";     break ;;
      3) RUNTIME="kubernetes"; break ;;
      *) err "Введите 1, 2 или 3" ;;
    esac
  done
  ok "Runtime: $RUNTIME"
}

# ─── step 4: profile ──────────────────────────────────────────────────────────
step_profile() {
  if $QUICK_MODE; then
    PROFILE="dev"; ok "Профиль: dev (quick mode)"; return
  fi

  h "Шаг 2/6 — Профиль развёртывания"
  blank
  printf "  ${W}1) Development (dev)${N}\n"
  printf "     • Локальная разработка и тестирование\n"
  printf "     • Fake S3 (LocalStack), fake email (MailHog)\n"
  printf "     • Слабые пароли по умолчанию — НЕ для публичного интернета\n"
  printf "     • Swagger UI доступен публично\n\n"
  printf "  ${W}2) Production${N}\n"
  printf "     • Реальный сервер, публичный или внутрикорпоративный\n"
  printf "     • Реальные S3/MinIO и SMTP, сильные секреты\n"
  printf "     • Swagger UI скрыт, TLS через reverse proxy\n\n"
  local __ch
  while true; do
    printf "Выбор [1]: "; read -r __ch </dev/tty; __ch="${__ch:-1}"
    case "$__ch" in
      1) PROFILE="dev";        break ;;
      2) PROFILE="production"; break ;;
      *) err "Введите 1 или 2" ;;
    esac
  done
  ok "Профиль: $PROFILE"
}

# ─── step 5: storage ──────────────────────────────────────────────────────────
step_storage() {
  h "Шаг 3/6 — Хранилище файлов"

  if $QUICK_MODE || [[ "$PROFILE" == "dev" ]]; then
    if $QUICK_MODE || ! yn "Использовать disk storage вместо LocalStack S3?" "n"; then
      STORAGE_MODE="s3-local"
      ok "Хранилище: LocalStack S3 (автоматически)"
      return
    fi
    STORAGE_MODE="disk-volume"
    ok "Хранилище: Docker named volume"
    return
  fi

  blank
  printf "  ${W}1) S3 / MinIO (внешний)${N}\n"
  printf "     AWS S3, MinIO, Ceph, Cloudflare R2 и т.д.\n"
  printf "     Рекомендуется для production: масштабируется, независимые backups.\n\n"
  printf "  ${W}2) Disk — Docker volume${N}\n"
  printf "     Файлы в именованном Docker volume на хосте.\n"
  printf "     Просто, без дополнительной настройки.\n\n"
  printf "  ${W}3) Disk — Директория на хосте${N}\n"
  printf "     Вы указываете путь (например, /mnt/nas/messenger).\n"
  printf "     Используйте для NFS, CIFS, заранее подготовленного раздела.\n\n"
  printf "  ${W}4) Disk — Отдельный блочный диск${N}\n"
  printf "     Скрипт форматирует и монтирует /dev/sdX.\n"
  printf "     Требуется root. Данные на диске будут уничтожены!\n\n"

  local __ch
  while true; do
    printf "Выбор [1]: "; read -r __ch </dev/tty; __ch="${__ch:-1}"
    case "$__ch" in
      1) STORAGE_MODE="s3-external"; break ;;
      2) STORAGE_MODE="disk-volume";  break ;;
      3) STORAGE_MODE="disk-host";    break ;;
      4) STORAGE_MODE="disk-device";  break ;;
      *) err "Введите 1, 2, 3 или 4" ;;
    esac
  done

  case "$STORAGE_MODE" in
    s3-external)
      sec "Настройка S3"
      ask S3_ENDPOINT "Endpoint S3 (URL)"      "https://s3.amazonaws.com"
      ask S3_KEY      "Access key"
      ask_secret S3_SECRET "Secret key"
      ask S3_BUCKET   "Имя bucket"             "messenger-files"
      ask S3_REGION   "Region"                 "us-east-1"
      if yn "Использовать path-style URLs? (нужно для MinIO/LocalStack)" "y"; then
        S3_PATH_STYLE="true"
      else
        S3_PATH_STYLE="false"
      fi
      ok "Хранилище: S3/MinIO ($S3_ENDPOINT, bucket: $S3_BUCKET)"
      ;;
    disk-volume)
      ok "Хранилище: Docker named volume (files_data)"
      info "Docker сам создаст volume. Данные хранятся в /var/lib/docker/volumes/."
      ;;
    disk-host)
      sec "Настройка host-директории"
      blank
      warn "Сервер внутри контейнера работает от UID 1000."
      warn "После ввода пути мастер выполнит: sudo chown -R 1000:1000 <путь>"
      blank
      ask STORAGE_HOST_PATH "Путь на хосте для uploads" "/srv/messenger/uploads"
      ok "Хранилище: host-директория $STORAGE_HOST_PATH"
      ;;
    disk-device)
      sec "Настройка отдельного диска"
      blank
      warn "!!! ВНИМАНИЕ: диск будет ОТФОРМАТИРОВАН, все данные на нём будут уничтожены !!!"
      blank
      if command -v lsblk &>/dev/null; then
        info "Доступные блочные устройства:"
        lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL 2>/dev/null | sed 's/^/  /'
      fi
      blank
      ask STORAGE_DEVICE    "Устройство (например, /dev/sdb)"
      ask STORAGE_HOST_PATH "Точка монтирования"          "/srv/messenger/uploads"
      ask STORAGE_DEVICE_FS "Файловая система"             "ext4"
      blank
      warn "Будет выполнено: mkfs.$STORAGE_DEVICE_FS $STORAGE_DEVICE → mount → fstab → docker-compose.disk.yml"
      if ! yn "Подтвердить форматирование $STORAGE_DEVICE?" "n"; then
        err "Отменено пользователем"; exit 1
      fi
      ok "Хранилище: диск $STORAGE_DEVICE → $STORAGE_HOST_PATH ($STORAGE_DEVICE_FS)"
      ;;
  esac
}

# ─── step 6: network ──────────────────────────────────────────────────────────
step_network() {
  h "Шаг 4/6 — Сеть и домен"

  if $QUICK_MODE || [[ "$PROFILE" == "dev" ]]; then
    CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8080"
    WS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8080"
    ok "Origins: localhost (dev)"
    return
  fi

  blank
  info "Укажите публичный URL, по которому Messenger будет доступен."
  info "Пример: https://chat.company.com"
  info "Этот URL используется для CORS и WebSocket."
  blank
  ask DOMAIN "Публичный URL"
  DOMAIN="${DOMAIN%/}"  # убрать trailing slash
  CORS_ORIGINS="$DOMAIN"
  WS_ORIGINS="$DOMAIN"

  if yn "Добавить дополнительные origins? (например, для staging)" "n"; then
    local extra
    ask extra "Дополнительные origins (через запятую)"
    CORS_ORIGINS="$CORS_ORIGINS,$extra"
    WS_ORIGINS="$WS_ORIGINS,$extra"
  fi
  ok "Domain: $DOMAIN"

  if [[ "$RUNTIME" == "kubernetes" ]]; then
    sec "Kubernetes настройки"
    ask HELM_NAMESPACE "Kubernetes namespace" "messenger"
    ask HELM_RELEASE   "Helm release name"    "messenger"
    if yn "Указать values-файл?" "y"; then
      ask HELM_VALUES "Путь к values.yaml" "helm/values-production.example.yaml"
    fi
  fi
}

# ─── step 7: email ────────────────────────────────────────────────────────────
step_email() {
  h "Шаг 5/6 — Email"

  if $QUICK_MODE || [[ "$PROFILE" == "dev" ]]; then
    MAIL_MODE="mailhog"
    ok "Email: MailHog (dev, порт 8025)"
    return
  fi

  blank
  info "Email нужен для сброса пароля и уведомлений."
  blank
  local __ch
  while true; do
    printf "  1) SMTP (реальный почтовый сервер)\n"
    printf "  2) Пропустить (email не работает)\n"
    printf "Выбор [1]: "; read -r __ch </dev/tty; __ch="${__ch:-1}"
    case "$__ch" in
      1) MAIL_MODE="smtp"; break ;;
      2) MAIL_MODE="skip"; break ;;
      *) err "Введите 1 или 2" ;;
    esac
  done

  if [[ "$MAIL_MODE" == "smtp" ]]; then
    sec "Настройка SMTP"
    ask SMTP_HOST "SMTP сервер (hostname)"
    ask SMTP_PORT "SMTP порт"               "587"
    ask SMTP_USER "SMTP имя пользователя"
    ask_secret SMTP_PASS "SMTP пароль"
    ok "SMTP: $SMTP_HOST:$SMTP_PORT (пользователь: $SMTP_USER)"
  else
    warn "Email не настроен. Сброс пароля не будет работать."
  fi
}

# ─── step 8: secrets ──────────────────────────────────────────────────────────
step_secrets() {
  h "Шаг 6/6 — Секреты"

  if $QUICK_MODE || [[ "$PROFILE" == "dev" ]]; then
    POSTGRES_PASSWORD="password"
    JWT_SECRET="$(gen_secret)"
    ok "Пароль PostgreSQL: password (dev default)"
    ok "JWT_SECRET: сгенерирован автоматически"
    return
  fi

  sec "Пароль PostgreSQL"
  if yn "Сгенерировать надёжный пароль автоматически?" "y"; then
    POSTGRES_PASSWORD="$(gen_secret)"
    ok "PostgreSQL пароль сгенерирован"
  else
    while true; do
      ask_secret POSTGRES_PASSWORD "Пароль PostgreSQL"
      local __confirm
      ask_secret __confirm "Подтвердите пароль"
      [[ "$POSTGRES_PASSWORD" == "$__confirm" ]] && break
      err "Пароли не совпадают. Попробуйте снова."
    done
  fi

  JWT_SECRET="$(gen_secret)"
  ok "JWT_SECRET сгенерирован (64 символа)"

  blank
  info "Сохраните пароли в надёжном месте (менеджер паролей)."
  info "Без них восстановление из backup будет невозможным."
}

# ─── write .env ───────────────────────────────────────────────────────────────
write_env() {
  h "Запись .env"

  local env_file="$PROJECT_DIR/.env"
  local src

  if [[ "$PROFILE" == "production" ]] && [[ -f "$PROJECT_DIR/.env.production.example" ]]; then
    src="$PROJECT_DIR/.env.production.example"
  else
    src="$PROJECT_DIR/.env.example"
  fi

  cp "$src" "$env_file"

  # --- Database ---
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" "$env_file"
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${POSTGRES_PASSWORD}|"             "$env_file"
  if [[ "$PROFILE" == "production" ]]; then
    sed -i "s|^POSTGRES_USER=.*|POSTGRES_USER=messenger|"     "$env_file"
    sed -i "s|^DB_USERNAME=.*|DB_USERNAME=messenger|"         "$env_file"
  fi

  # --- JWT ---
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$env_file"

  # --- CORS / WS ---
  sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=${CORS_ORIGINS}|" "$env_file"
  sed -i "s|^WS_ALLOWED_ORIGINS=.*|WS_ALLOWED_ORIGINS=${WS_ORIGINS}|"       "$env_file"

  # --- Storage ---
  case "$STORAGE_MODE" in
    s3-local)
      sed -i "s|^STORAGE_PROVIDER=.*|STORAGE_PROVIDER=s3|"                    "$env_file"
      sed -i "s|^S3_ENDPOINT=.*|S3_ENDPOINT=http://localstack:4566|"           "$env_file"
      sed -i "s|^S3_ACCESS_KEY=.*|S3_ACCESS_KEY=test|"                         "$env_file"
      sed -i "s|^S3_SECRET_KEY=.*|S3_SECRET_KEY=test|"                         "$env_file"
      sed -i "s|^S3_PATH_STYLE_ACCESS_ENABLED=.*|S3_PATH_STYLE_ACCESS_ENABLED=true|" "$env_file"
      sed -i "s|^S3_AUTO_CREATE_BUCKET=.*|S3_AUTO_CREATE_BUCKET=true|"         "$env_file"
      ;;
    s3-external)
      sed -i "s|^STORAGE_PROVIDER=.*|STORAGE_PROVIDER=s3|"                               "$env_file"
      sed -i "s|^S3_ENDPOINT=.*|S3_ENDPOINT=${S3_ENDPOINT}|"                             "$env_file"
      sed -i "s|^S3_ACCESS_KEY=.*|S3_ACCESS_KEY=${S3_KEY}|"                              "$env_file"
      sed -i "s|^S3_SECRET_KEY=.*|S3_SECRET_KEY=${S3_SECRET}|"                           "$env_file"
      sed -i "s|^S3_BUCKET_NAME=.*|S3_BUCKET_NAME=${S3_BUCKET}|"                         "$env_file"
      sed -i "s|^S3_REGION=.*|S3_REGION=${S3_REGION}|"                                   "$env_file"
      sed -i "s|^S3_PATH_STYLE_ACCESS_ENABLED=.*|S3_PATH_STYLE_ACCESS_ENABLED=${S3_PATH_STYLE}|" "$env_file"
      sed -i "s|^S3_AUTO_CREATE_BUCKET=.*|S3_AUTO_CREATE_BUCKET=false|"                  "$env_file"
      ;;
    disk-volume|disk-host|disk-device)
      sed -i "s|^STORAGE_PROVIDER=.*|STORAGE_PROVIDER=disk|"         "$env_file"
      sed -i "s|^STORAGE_DISK_PATH=.*|STORAGE_DISK_PATH=/data/uploads|" "$env_file"
      ;;
  esac

  # --- Mail ---
  case "$MAIL_MODE" in
    mailhog)
      sed -i "s|^MAIL_HOST=.*|MAIL_HOST=mailhog|" "$env_file"
      sed -i "s|^MAIL_PORT=.*|MAIL_PORT=1025|"     "$env_file"
      ;;
    smtp)
      sed -i "s|^MAIL_HOST=.*|MAIL_HOST=${SMTP_HOST}|" "$env_file"
      sed -i "s|^MAIL_PORT=.*|MAIL_PORT=${SMTP_PORT}|" "$env_file"
      grep -q "^MAIL_USERNAME=" "$env_file" \
        && sed -i "s|^MAIL_USERNAME=.*|MAIL_USERNAME=${SMTP_USER}|" "$env_file" \
        || echo "MAIL_USERNAME=${SMTP_USER}" >> "$env_file"
      grep -q "^MAIL_PASSWORD=" "$env_file" \
        && sed -i "s|^MAIL_PASSWORD=.*|MAIL_PASSWORD=${SMTP_PASS}|" "$env_file" \
        || echo "MAIL_PASSWORD=${SMTP_PASS}" >> "$env_file"
      ;;
  esac

  ok ".env записан: $env_file"
}

# ─── write docker-compose.override.yml ───────────────────────────────────────
write_compose_override() {
  [[ "$RUNTIME" == "kubernetes" ]] && return
  [[ "$STORAGE_MODE" != "disk-host" ]]  && return

  local override="$PROJECT_DIR/docker-compose.override.yml"
  cat > "$override" <<EOF
# Автоматически создан install-wizard.sh
# Монтирование host-директории для uploads.
# Директория: ${STORAGE_HOST_PATH}
services:
  server:
    environment:
      STORAGE_PROVIDER: disk
      STORAGE_DISK_PATH: /data/uploads
    volumes:
      - ${STORAGE_HOST_PATH}:/data/uploads
  worker:
    environment:
      STORAGE_PROVIDER: disk
      STORAGE_DISK_PATH: /data/uploads
    volumes:
      - ${STORAGE_HOST_PATH}:/data/uploads
EOF
  ok "docker-compose.override.yml записан (host dir: $STORAGE_HOST_PATH)"
}

# ─── summary ──────────────────────────────────────────────────────────────────
step_summary() {
  h "Итог"
  blank
  printf "  %-24s %s\n" "Runtime:"        "$RUNTIME"
  printf "  %-24s %s\n" "Профиль:"        "$PROFILE"
  printf "  %-24s %s\n" "Хранилище:"      "$STORAGE_MODE"
  [[ -n "$STORAGE_HOST_PATH" ]] && \
    printf "  %-24s %s\n" "Host path:"    "$STORAGE_HOST_PATH"
  [[ -n "$STORAGE_DEVICE" ]] && \
    printf "  %-24s %s\n" "Диск:"         "$STORAGE_DEVICE ($STORAGE_DEVICE_FS)"
  printf "  %-24s %s\n" "Email:"          "$MAIL_MODE"
  [[ -n "$DOMAIN" ]] && \
    printf "  %-24s %s\n" "Домен:"        "$DOMAIN"
  [[ "$RUNTIME" == "kubernetes" ]] && {
    printf "  %-24s %s\n" "K8s namespace:" "$HELM_NAMESPACE"
    printf "  %-24s %s\n" "Helm release:"  "$HELM_RELEASE"
    [[ -n "$HELM_VALUES" ]] && \
      printf "  %-24s %s\n" "Helm values:"   "$HELM_VALUES"
  }
  blank
  printf "  ${W}Файлы, которые будут изменены:${N}\n"
  info "  $PROJECT_DIR/.env"
  [[ "$STORAGE_MODE" == "disk-host" ]] && \
    info "  $PROJECT_DIR/docker-compose.override.yml"
  blank
  yn "Продолжить установку?" "y" || { warn "Отменено."; exit 0; }
}

# ─── launch ───────────────────────────────────────────────────────────────────
step_launch() {
  h "Установка"

  # Подготовка host-директории
  if [[ "$STORAGE_MODE" == "disk-host" && -n "$STORAGE_HOST_PATH" ]]; then
    sec "Создание и настройка host-директории"
    if sudo mkdir -p "$STORAGE_HOST_PATH" && sudo chown -R 1000:1000 "$STORAGE_HOST_PATH"; then
      ok "Директория подготовлена: $STORAGE_HOST_PATH (owner 1000:1000)"
    else
      warn "Не удалось создать/изменить права на $STORAGE_HOST_PATH"
      warn "Выполните вручную:"
      info "  sudo mkdir -p $STORAGE_HOST_PATH"
      info "  sudo chown -R 1000:1000 $STORAGE_HOST_PATH"
    fi
  fi

  # Отдельный диск — через messengerctl.sh disk-install
  if [[ "$STORAGE_MODE" == "disk-device" ]]; then
    sec "Настройка блочного диска"
    warn "Форматирование и монтирование требует root."
    local disk_cmd="$CTL disk-install --device $STORAGE_DEVICE --mount-point $STORAGE_HOST_PATH --fs $STORAGE_DEVICE_FS --force"
    if yn "Запустить: $disk_cmd?" "y"; then
      bash $disk_cmd
    else
      warn "Диск не настроен. Выполните команду вручную:"
      info "  $disk_cmd"
    fi
  fi

  # Запуск через messengerctl.sh
  if [[ ! -f "$CTL" ]]; then
    err "Не найден скрипт управления: $CTL"
    err "Запустите установку вручную:"
    info "  docker compose up -d --build"
    exit 1
  fi

  local install_args=("install" "--runtime" "$RUNTIME")
  [[ "$PROFILE" == "production" ]] && install_args+=("--profile" "production")
  [[ "$RUNTIME" == "kubernetes" ]] && {
    install_args+=("--namespace" "$HELM_NAMESPACE" "--release" "$HELM_RELEASE")
    [[ -n "$HELM_VALUES" ]] && install_args+=("--values" "$HELM_VALUES")
  }

  sec "Запуск: messengerctl.sh ${install_args[*]}"
  bash "$CTL" "${install_args[@]}"
}

# ─── post-install info ────────────────────────────────────────────────────────
step_post_install() {
  h "Установка завершена"
  blank
  if [[ "$PROFILE" == "dev" ]]; then
    ok "Dev-окружение запущено:"
    info "  API:       http://localhost:8080"
    info "  Swagger:   http://localhost:8080/swagger-ui/index.html"
    info "  Web UI:    http://localhost:3001"
    info "  MailHog:   http://localhost:8025"
    info "  Health:    http://localhost:8080/actuator/health"
  else
    ok "Production-окружение запущено:"
    [[ -n "$DOMAIN" ]] && info "  Web UI:    $DOMAIN"
    info "  API:       http://localhost:8080 (за reverse proxy)"
    info "  Health:    http://localhost:8080/actuator/health"
  fi

  blank
  printf "  ${W}Учётные данные по умолчанию (только для dev!):${N}\n"
  info "  Admin: admin / admin123"
  info "  PostgreSQL: postgres / password"
  blank

  if [[ "$PROFILE" == "production" ]]; then
    printf "  ${W}Следующие шаги для production:${N}\n"
    info "  1. Настройте reverse proxy (Nginx/Caddy)"
    info "     Шаблон: deploy/nginx/messenger.conf.example"
    info "  2. Настройте TLS-сертификат (Let's Encrypt / корпоративный CA)"
    info "  3. Смените пароль admin через веб-интерфейс"
    info "  4. Для LDAP/AD см. docs/AD_LDAP_TESTING.md"
    info "  5. Для OIDC (ADFS/Azure AD) см. docs/AD_LDAP_TESTING.md#oidc"
    info "  6. Настройте backup:"
    info "     ./scripts/messengerctl.sh backup"
  fi
  blank
}

# ─── main ─────────────────────────────────────────────────────────────────────
main() {
  parse_args "$@"

  cd "$PROJECT_DIR"

  step_welcome
  step_prerequisites
  step_runtime
  step_profile
  step_storage
  step_network
  step_email
  step_secrets
  write_env
  write_compose_override
  step_summary
  step_launch
  step_post_install
}

main "$@"
