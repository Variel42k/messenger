#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
PROJECT_DIR=""
ENV_FILE=""
COMMAND="${1:-help}"
YES=false
FORCE=false
NO_BACKUP=false
DRY_RUN=false
KEEP_DATA=false
BACKUP_DIR=""
BACKUP_FILE=""
DEVICE=""
MOUNT_POINT=""
FS_TYPE="ext4"
SERVICE="all"
TAIL="100"
HEALTH_URL="http://localhost:8080/actuator/health"
WEB_URL="http://localhost:3001"
DISK_COMPOSE_FILE="docker-compose.disk.yml"

if [[ $# -gt 0 ]]; then
  shift
fi

log_info() { printf '[INFO] %s\n' "$*"; }
log_warn() { printf '[WARN] %s\n' "$*" >&2; }
log_error() { printf '[ERROR] %s\n' "$*" >&2; }
die() { log_error "$*"; exit 1; }

confirm() {
  local prompt="${1:-Continue?}"
  if [[ "$YES" == "true" ]]; then
    return 0
  fi
  read -r -p "$prompt [y/N] " answer
  case "$answer" in
    y|Y|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

run_cmd() {
  log_info "+ $*"
  if [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi
  "$@"
}

run_privileged() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    run_cmd "$@"
  else
    require_command sudo
    run_cmd sudo "$@"
  fi
}

detect_project_dir() {
  if [[ -n "$PROJECT_DIR" ]]; then
    PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd -P)"
  elif [[ -f "docker-compose.yml" && -f ".env.example" ]]; then
    PROJECT_DIR="$(pwd -P)"
  else
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
    if [[ -f "$script_dir/../docker-compose.yml" ]]; then
      PROJECT_DIR="$(cd "$script_dir/.." && pwd -P)"
    else
      die "Cannot detect project root. Run from repository root or pass --project-dir."
    fi
  fi
  [[ -f "$PROJECT_DIR/docker-compose.yml" ]] || die "docker-compose.yml not found in $PROJECT_DIR"
  ENV_FILE="$PROJECT_DIR/.env"
  BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
}

compose() {
  local args=(docker compose --project-directory "$PROJECT_DIR" -f "$PROJECT_DIR/docker-compose.yml")
  if [[ -f "$PROJECT_DIR/$DISK_COMPOSE_FILE" ]]; then
    args+=(-f "$PROJECT_DIR/$DISK_COMPOSE_FILE")
  fi
  run_cmd "${args[@]}" "$@"
}

compose_capture() {
  local args=(docker compose --project-directory "$PROJECT_DIR" -f "$PROJECT_DIR/docker-compose.yml")
  if [[ -f "$PROJECT_DIR/$DISK_COMPOSE_FILE" ]]; then
    args+=(-f "$PROJECT_DIR/$DISK_COMPOSE_FILE")
  fi
  "${args[@]}" "$@"
}

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    while IFS='=' read -r key value; do
      [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
      value="${value%$'\r'}"
      export "$key=$value"
    done < <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE" || true)
  fi
}

set_env_var() {
  local key="$1"
  local value="$2"
  [[ -f "$ENV_FILE" ]] || run_cmd cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
  log_info "Setting $key in .env"
  if [[ "$DRY_RUN" == "true" ]]; then
    return 0
  fi
  local tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { done=0 }
    $0 ~ "^" key "=" { print key "=" value; done=1; next }
    { print }
    END { if (!done) print key "=" value }
  ' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}

generate_jwt_secret() {
  require_command openssl
  openssl rand -base64 64
}

ensure_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    log_info "Creating .env from .env.example"
    run_cmd cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
  fi
  load_env
  local current="${JWT_SECRET:-}"
  if [[ -z "$current" || "$current" == "replace-this-with-a-strong-256-bit-secret" || "$current" == "mySecretKeyForDevelopmentOnlyMustBe256Bits!!" || "$current" == *DevelopmentOnly* ]]; then
    local generated
    generated="$(generate_jwt_secret)"
    set_env_var "JWT_SECRET" "$generated"
    log_info "Generated a new JWT_SECRET in .env"
  fi
}

wait_for_health() {
  local url="${1:-$HEALTH_URL}"
  local attempts="${2:-60}"
  local delay="${3:-5}"
  local i
  for ((i=1; i<=attempts; i++)); do
    if command -v curl >/dev/null 2>&1; then
      if curl -fsS "$url" >/dev/null 2>&1; then
        log_info "Backend health check passed: $url"
        return 0
      fi
    elif command -v wget >/dev/null 2>&1; then
      if wget -qO- "$url" >/dev/null 2>&1; then
        log_info "Backend health check passed: $url"
        return 0
      fi
    else
      die "curl or wget is required for health checks"
    fi
    sleep "$delay"
  done
  log_error "Backend health check failed: $url"
  log_error "Logs: ./scripts/$SCRIPT_NAME logs --service server --tail 200"
  log_error "Possible causes: database not ready, Redis not ready, invalid JWT_SECRET, invalid storage settings."
  log_error "Troubleshooting: docs/DEPLOYMENT.md#troubleshooting"
  return 1
}

check_web() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "$WEB_URL" >/dev/null 2>&1
  else
    wget -qO- "$WEB_URL" >/dev/null 2>&1
  fi
}

check_postgres() {
  docker exec messenger-postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-messenger}" >/dev/null 2>&1
}

check_redis() {
  [[ "$(docker exec messenger-redis redis-cli ping 2>/dev/null || true)" == "PONG" ]]
}

check_localstack() {
  docker exec messenger-localstack awslocal s3 ls >/dev/null 2>&1 || docker exec messenger-localstack curl -fsS http://localhost:4566/_localstack/health >/dev/null 2>&1
}

compose_project_name() {
  if [[ -n "${COMPOSE_PROJECT_NAME:-}" ]]; then
    printf '%s\n' "$COMPOSE_PROJECT_NAME"
  else
    basename "$PROJECT_DIR" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/_/g'
  fi
}

volume_name() {
  printf '%s_%s\n' "$(compose_project_name)" "$1"
}

backup_postgres() {
  local dest="$1"
  log_info "Backing up PostgreSQL"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write PostgreSQL dump to $dest"
    return 0
  fi
  if ! docker ps --format '{{.Names}}' | grep -qx 'messenger-postgres'; then
    compose up -d postgres
  fi
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-messenger}" > "$dest"
}

restore_postgres() {
  local dump="$1"
  [[ -f "$dump" ]] || die "PostgreSQL dump not found in backup"
  log_warn "Restoring PostgreSQL will overwrite current database contents."
  confirm "Restore PostgreSQL database from backup?" || die "Restore cancelled"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would restore PostgreSQL from $dump"
    return 0
  fi
  compose up -d postgres
  sleep 5
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    psql -U "${POSTGRES_USER:-postgres}" -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB:-messenger}' AND pid <> pg_backend_pid();" >/dev/null
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    dropdb -U "${POSTGRES_USER:-postgres}" --if-exists "${POSTGRES_DB:-messenger}"
  docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    createdb -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-messenger}"
  docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-messenger}" -v ON_ERROR_STOP=1 < "$dump"
}

disk_source_path() {
  local file="$PROJECT_DIR/$DISK_COMPOSE_FILE"
  [[ -f "$file" ]] || return 1
  awk -F: '/:\/data\/uploads/ { gsub(/^[[:space:]]*- /, "", $1); print $1; exit }' "$file"
}

backup_uploads() {
  local dest="$1"
  local host_path=""
  host_path="$(disk_source_path || true)"
  log_info "Backing up uploads"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write uploads archive to $dest"
    return 0
  fi
  if [[ -n "$host_path" && -d "$host_path" ]]; then
    tar -czf "$dest" -C "$host_path" .
  else
    docker run --rm -v "$(volume_name files_data):/data:ro" -v "$(dirname "$dest"):/backup" alpine:3.20 \
      sh -c "cd /data && tar -czf /backup/$(basename "$dest") ."
  fi
}

backup_localstack() {
  local dest="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write LocalStack archive to $dest"
    return 0
  fi
  docker run --rm -v "$(volume_name localstack_data):/data:ro" -v "$(dirname "$dest"):/backup" alpine:3.20 \
    sh -c "cd /data && tar -czf /backup/$(basename "$dest") ." || log_warn "LocalStack backup skipped"
}

backup_redis() {
  local dest="$1"
  log_info "Backing up Redis volume"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write Redis archive to $dest"
    return 0
  fi
  docker run --rm -v "$(volume_name redis_data):/data:ro" -v "$(dirname "$dest"):/backup" alpine:3.20 \
    sh -c "cd /data && tar -czf /backup/$(basename "$dest") ." || log_warn "Redis backup skipped"
}

redact_env() {
  local source="$1"
  local dest="$2"
  if [[ ! -f "$source" ]]; then
    return 0
  fi
  sed -E 's/^((.*PASSWORD|.*SECRET|.*TOKEN|S3_SECRET_KEY|JWT_SECRET)=).*/\1<redacted>/I' "$source" > "$dest"
}

backup_metadata() {
  local dest="$1"
  {
    printf 'created_at=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    printf 'project_dir=%s\n' "$PROJECT_DIR"
    printf 'git_commit=%s\n' "$(git -C "$PROJECT_DIR" rev-parse HEAD 2>/dev/null || printf 'unknown')"
    printf '\n[docker ps]\n'
    docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true
    printf '\n[docker compose ps]\n'
    compose_capture ps 2>/dev/null || true
  } > "$dest"
}

create_backup_archive() {
  require_command tar
  require_command gzip
  require_command docker
  require_command date
  load_env
  mkdir -p "$BACKUP_DIR"
  local ts tmp archive
  ts="$(date '+%Y%m%d-%H%M%S')"
  tmp="$BACKUP_DIR/.messenger-backup-$ts"
  archive="$BACKUP_DIR/messenger-backup-$ts.tar.gz"
  rm -rf "$tmp"
  mkdir -p "$tmp"
  backup_postgres "$tmp/postgres.sql"
  backup_uploads "$tmp/files_data.tar.gz"
  backup_redis "$tmp/redis_data.tar.gz"
  backup_localstack "$tmp/localstack_data.tar.gz"
  cp "$PROJECT_DIR/docker-compose.yml" "$tmp/docker-compose.yml"
  [[ -f "$PROJECT_DIR/docker-compose.override.yml" ]] && cp "$PROJECT_DIR/docker-compose.override.yml" "$tmp/docker-compose.override.yml"
  [[ -f "$PROJECT_DIR/$DISK_COMPOSE_FILE" ]] && cp "$PROJECT_DIR/$DISK_COMPOSE_FILE" "$tmp/$DISK_COMPOSE_FILE"
  [[ -f "$ENV_FILE" ]] && cp "$ENV_FILE" "$tmp/.env"
  redact_env "$ENV_FILE" "$tmp/.env.redacted"
  backup_metadata "$tmp/metadata.txt"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would create archive $archive"
    return 0
  fi
  tar -czf "$archive" -C "$tmp" .
  rm -rf "$tmp"
  log_info "Backup created: $archive"
  log_info "Backup size: $(du -h "$archive" | awk '{print $1}')"
}

restore_uploads_archive() {
  local archive="$1"
  [[ -f "$archive" ]] || return 0
  log_warn "Restoring uploads will overwrite current uploads/files_data."
  confirm "Restore uploads from backup?" || die "Restore cancelled"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would restore uploads from $archive"
    return 0
  fi
  local host_path=""
  host_path="$(disk_source_path || true)"
  if [[ -n "$host_path" && -d "$host_path" ]]; then
    find "$host_path" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    tar -xzf "$archive" -C "$host_path"
  else
    docker run --rm -v "$(volume_name files_data):/data" -v "$(dirname "$archive"):/backup" alpine:3.20 \
      sh -c "rm -rf /data/* /data/.[!.]* /data/..?* 2>/dev/null || true; tar -xzf /backup/$(basename "$archive") -C /data"
  fi
}

list_disks() {
  require_command lsblk
  lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL
}

write_compose_override_for_disk() {
  local mount_point="$1"
  local file="$PROJECT_DIR/$DISK_COMPOSE_FILE"
  if [[ -f "$file" ]] && ! grep -q "Managed by messengerctl disk-install" "$file"; then
    confirm "$file exists and is not marked as managed by messengerctl. Overwrite it?" || die "Disk compose update cancelled"
  fi
  log_info "Writing $DISK_COMPOSE_FILE for disk storage"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write bind mount $mount_point:/data/uploads"
    return 0
  fi
  cat > "$file" <<EOF
# Управляется командой messengerctl disk-install.
# Ручной запуск:
#   docker compose -f docker-compose.yml -f docker-compose.disk.yml up -d
services:
  server:
    environment:
      STORAGE_PROVIDER: disk
      STORAGE_DISK_PATH: /data/uploads
    volumes:
      - ${mount_point}:/data/uploads
  worker:
    environment:
      STORAGE_PROVIDER: disk
      STORAGE_DISK_PATH: /data/uploads
    volumes:
      - ${mount_point}:/data/uploads
EOF
}

install_disk() {
  [[ -n "$DEVICE" ]] || die "disk-install requires --device /dev/sdX"
  [[ -n "$MOUNT_POINT" ]] || die "disk-install requires --mount-point /srv/messenger/uploads"
  [[ "$FS_TYPE" == "ext4" || "$FS_TYPE" == "xfs" ]] || die "--fs must be ext4 or xfs"
  require_command lsblk
  require_command findmnt
  require_command mount
  require_command umount
  require_command blkid
  list_disks
  [[ -b "$DEVICE" ]] || die "Device does not exist or is not a block device: $DEVICE"
  if findmnt -S "$DEVICE" >/dev/null 2>&1 || [[ -n "$(lsblk -no MOUNTPOINT "$DEVICE" | tr -d '[:space:]')" ]]; then
    die "Device is already mounted: $DEVICE"
  fi
  [[ "$FORCE" == "true" ]] || die "Refusing to format $DEVICE without --force"
  confirm "Format $DEVICE as $FS_TYPE? This destroys data on the device." || die "Disk format cancelled"
  if [[ "$FS_TYPE" == "ext4" ]]; then
    require_command mkfs.ext4
    run_privileged mkfs.ext4 -F "$DEVICE"
  else
    require_command mkfs.xfs
    run_privileged mkfs.xfs -f "$DEVICE"
  fi
  run_privileged mkdir -p "$MOUNT_POINT"
  run_privileged mount "$DEVICE" "$MOUNT_POINT"
  local uuid
  uuid="$(blkid -s UUID -o value "$DEVICE")"
  [[ -n "$uuid" ]] || die "Cannot read UUID for $DEVICE"
  local fstab_line="UUID=$uuid $MOUNT_POINT $FS_TYPE defaults,nofail 0 2"
  if ! grep -q "UUID=$uuid" /etc/fstab 2>/dev/null; then
    log_info "Adding /etc/fstab entry for $MOUNT_POINT"
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "Would append: $fstab_line"
    elif [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
      printf '%s\n' "$fstab_line" >> /etc/fstab
    else
      printf '%s\n' "$fstab_line" | sudo tee -a /etc/fstab >/dev/null
    fi
  fi
  findmnt "$MOUNT_POINT" >/dev/null || die "Mount verification failed: $MOUNT_POINT"
  run_privileged mkdir -p "$MOUNT_POINT"
  run_privileged chmod 0775 "$MOUNT_POINT"
  write_compose_override_for_disk "$MOUNT_POINT"
  set_env_var "STORAGE_PROVIDER" "disk"
  set_env_var "STORAGE_DISK_PATH" "/data/uploads"
  compose up -d server worker
  wait_for_health
}

remove_disk() {
  [[ -n "$MOUNT_POINT" ]] || die "disk-remove requires --mount-point"
  require_command findmnt
  require_command umount
  if ! findmnt "$MOUNT_POINT" >/dev/null 2>&1; then
    log_warn "$MOUNT_POINT is not mounted"
  fi
  compose stop
  mkdir -p "$BACKUP_DIR"
  if [[ -d "$MOUNT_POINT" ]]; then
    local ts backup_path
    ts="$(date '+%Y%m%d-%H%M%S')"
    backup_path="$BACKUP_DIR/uploads-before-disk-remove-$ts.tar.gz"
    log_info "Backing up mounted uploads to $backup_path"
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "Would create $backup_path"
    else
      tar -czf "$backup_path" -C "$MOUNT_POINT" .
    fi
  fi
  if [[ -f "$PROJECT_DIR/$DISK_COMPOSE_FILE" ]]; then
    run_cmd mv "$PROJECT_DIR/$DISK_COMPOSE_FILE" "$PROJECT_DIR/$DISK_COMPOSE_FILE.disabled.$(date '+%Y%m%d-%H%M%S')"
  fi
  if grep -q "[[:space:]]$MOUNT_POINT[[:space:]]" /etc/fstab 2>/dev/null; then
    log_info "Commenting /etc/fstab entry for $MOUNT_POINT"
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "Would comment matching /etc/fstab entry"
    else
      local tmp
      tmp="$(mktemp)"
      awk -v mp="$MOUNT_POINT" '$2 == mp && $0 !~ /^#/ { print "# disabled by messengerctl disk-remove: " $0; next } { print }' /etc/fstab > "$tmp"
      if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
        cp "$tmp" /etc/fstab
      else
        sudo cp "$tmp" /etc/fstab
      fi
      rm -f "$tmp"
    fi
  fi
  if findmnt "$MOUNT_POINT" >/dev/null 2>&1; then
    run_privileged umount "$MOUNT_POINT"
  fi
  compose up -d
  wait_for_health
}

doctor() {
  local failed=0
  log_info "Project: $PROJECT_DIR"
  for cmd in docker git openssl tar gzip; do
    if command -v "$cmd" >/dev/null 2>&1; then log_info "Found $cmd"; else log_warn "Missing $cmd"; failed=1; fi
  done
  if command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1; then
    log_info "Found curl or wget"
  else
    log_warn "Missing curl/wget"
    failed=1
  fi
  for cmd in lsblk findmnt mount umount; do
    command -v "$cmd" >/dev/null 2>&1 && log_info "Found $cmd" || log_warn "Missing $cmd (needed for disk commands)"
  done
  if command -v docker >/dev/null 2>&1; then
    docker info >/dev/null 2>&1 && log_info "Docker daemon is reachable" || { log_warn "Docker daemon is not reachable"; failed=1; }
    docker compose version >/dev/null 2>&1 && log_info "Docker Compose plugin is available" || { log_warn "Docker Compose plugin is missing"; failed=1; }
    compose_capture config >/dev/null 2>&1 && log_info "docker compose config is valid" || { log_warn "docker compose config failed"; failed=1; }
  fi
  if [[ -f "$ENV_FILE" ]]; then
    load_env
    log_info ".env exists"
  else
    log_warn ".env is missing; install will create it from .env.example"
  fi
  if [[ -z "${JWT_SECRET:-}" || "${JWT_SECRET:-}" == "replace-this-with-a-strong-256-bit-secret" || "${JWT_SECRET:-}" == *DevelopmentOnly* ]]; then
    log_warn "JWT_SECRET is missing or uses a development/example value"
    failed=1
  else
    log_info "JWT_SECRET looks configured"
  fi
  [[ -n "${CORS_ALLOWED_ORIGINS:-}" ]] && log_info "CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS}" || log_warn "CORS_ALLOWED_ORIGINS is not set"
  [[ -n "${WS_ALLOWED_ORIGINS:-}" ]] && log_info "WS_ALLOWED_ORIGINS=${WS_ALLOWED_ORIGINS}" || log_warn "WS_ALLOWED_ORIGINS is not set"
  [[ -n "${STORAGE_PROVIDER:-}" ]] && log_info "STORAGE_PROVIDER=${STORAGE_PROVIDER}" || log_warn "STORAGE_PROVIDER is not set"
  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    log_info "Messenger volumes:"
    docker volume ls --format '{{.Name}}' | grep -E '(^|_)((postgres|redis|localstack|files)_data)$' || log_warn "No Messenger data volumes found yet"
    check_postgres && log_info "PostgreSQL is ready" || log_warn "PostgreSQL is not ready"
    check_redis && log_info "Redis ping OK" || log_warn "Redis ping failed"
    if command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1; then
      wait_for_health "$HEALTH_URL" 1 1 >/dev/null 2>&1 && log_info "Backend health OK" || log_warn "Backend health endpoint is not reachable"
      check_web && log_info "Web client is reachable" || log_warn "Web client is not reachable"
    fi
  fi
  if [[ "$failed" -ne 0 ]]; then
    log_warn "Doctor found issues. See docs/DEPLOYMENT.md#troubleshooting."
  else
    log_info "Doctor finished without required dependency issues."
  fi
  return 0
}

post_start_checks() {
  compose ps
  wait_for_health || return 1
  check_web && log_info "Web client is reachable: $WEB_URL" || log_warn "Web client is not reachable: $WEB_URL"
  check_postgres && log_info "PostgreSQL is ready" || log_warn "PostgreSQL check failed. Logs: $SCRIPT_NAME logs --service postgres --tail 200"
  check_redis && log_info "Redis ping OK" || log_warn "Redis check failed. Logs: $SCRIPT_NAME logs --service redis --tail 200"
  check_localstack && log_info "LocalStack/S3 check OK" || log_warn "LocalStack/S3 check failed. Logs: $SCRIPT_NAME logs --service localstack --tail 200"
}

cmd_install() {
  require_command docker
  require_command git
  require_command openssl
  require_command tar
  require_command gzip
  command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 || die "curl or wget is required"
  docker compose version >/dev/null 2>&1 || die "Docker Compose plugin is required. Install 'docker compose'; legacy docker-compose is not supported."
  ensure_env
  mkdir -p "$PROJECT_DIR/backups"
  compose build
  compose up -d
  post_start_checks
  log_info "API server: http://localhost:8080"
  log_info "Swagger UI: http://localhost:8080/swagger-ui/index.html"
  log_info "Web client: $WEB_URL"
  log_info "LocalStack S3: http://localhost:4566"
}

cmd_update() {
  [[ "$NO_BACKUP" == "true" ]] || create_backup_archive
  if [[ -d "$PROJECT_DIR/.git" ]]; then
    run_cmd git -C "$PROJECT_DIR" pull
  else
    log_warn "Not a git repository; skipping git pull"
  fi
  compose build
  compose up -d --build
  if ! post_start_checks; then
    log_error "Update health check failed."
    log_error "Rollback: restore the backup created before update, or run: git -C '$PROJECT_DIR' reset --hard <previous-commit> && docker compose up -d --build"
    return 1
  fi
}

cmd_restore() {
  [[ -n "$BACKUP_FILE" ]] || die "restore requires --file /path/to/backup.tar.gz"
  [[ -f "$BACKUP_FILE" ]] || die "Backup archive not found: $BACKUP_FILE"
  require_command tar
  local tmp
  tmp="$(mktemp -d)"
  tar -xzf "$BACKUP_FILE" -C "$tmp"
  log_warn "Restore will stop containers and overwrite selected data."
  confirm "Continue restore from $BACKUP_FILE?" || die "Restore cancelled"
  compose stop
  [[ -f "$tmp/docker-compose.override.yml" ]] && cp "$tmp/docker-compose.override.yml" "$PROJECT_DIR/docker-compose.override.yml"
  [[ -f "$tmp/$DISK_COMPOSE_FILE" ]] && cp "$tmp/$DISK_COMPOSE_FILE" "$PROJECT_DIR/$DISK_COMPOSE_FILE"
  if [[ -f "$tmp/.env" ]]; then
    if [[ -f "$ENV_FILE" ]]; then
      confirm "Overwrite current .env from backup?" && cp "$tmp/.env" "$ENV_FILE" || log_warn "Keeping current .env"
    else
      cp "$tmp/.env" "$ENV_FILE"
    fi
  fi
  load_env
  restore_postgres "$tmp/postgres.sql"
  restore_uploads_archive "$tmp/files_data.tar.gz"
  compose up -d
  post_start_checks
  rm -rf "$tmp"
}

cmd_uninstall() {
  if [[ "$NO_BACKUP" != "true" ]]; then
    confirm "Create backup before uninstall?" && create_backup_archive || log_warn "Backup skipped"
  fi
  compose down
  log_info "Containers and default network removed. Volumes were kept."
}

cmd_purge() {
  [[ "$FORCE" == "true" ]] || die "purge requires --force"
  log_warn "Purge removes containers, networks and volumes."
  confirm "Really purge Messenger data volumes?" || die "Purge cancelled"
  if [[ "$NO_BACKUP" != "true" ]]; then
    create_backup_archive
  fi
  compose down -v --remove-orphans
}

cmd_status() {
  load_env
  compose ps
  wait_for_health "$HEALTH_URL" 1 1 >/dev/null 2>&1 && log_info "Backend health OK" || log_warn "Backend health failed"
  check_web && log_info "Web client reachable" || log_warn "Web client unavailable"
  log_info "STORAGE_PROVIDER=${STORAGE_PROVIDER:-unset}"
  log_info "Docker volumes:"
  docker system df -v 2>/dev/null | sed -n '/Local Volumes space usage:/,$p' || true
  local host_path=""
  host_path="$(disk_source_path || true)"
  [[ -n "$host_path" && -d "$host_path" ]] && du -sh "$host_path" || true
}

cmd_logs() {
  local target=()
  case "$SERVICE" in
    all) target=() ;;
    server|web-client|postgres|redis|localstack|worker|mailhog) target=("$SERVICE") ;;
    *) die "Unknown service: $SERVICE" ;;
  esac
  compose logs --tail "$TAIL" "${target[@]}"
}

cmd_restart() {
  compose restart
  post_start_checks
}

cmd_stop() {
  compose stop
}

cmd_start() {
  compose up -d
  post_start_checks
}

cmd_help() {
  cat <<'EOF'
Скрипт управления Messenger

Использование:
  ./scripts/messengerctl.sh <command> [options]

Команды:
  install       Проверить зависимости, подготовить .env, собрать и запустить сервисы.
  update        Создать backup, выполнить git pull, пересобрать и перезапустить сервисы.
  backup        Создать backups/messenger-backup-YYYYmmdd-HHMMSS.tar.gz.
  restore       Восстановить данные из backup-архива, указанного через --file.
  uninstall     Остановить и удалить контейнеры, volumes по умолчанию сохранить.
  purge         Удалить контейнеры, networks и volumes. Требует --force.
  status        Показать compose status, health и сводку по storage.
  logs          Показать compose logs выбранного сервиса.
  restart       Перезапустить сервисы и выполнить health checks.
  stop          Остановить сервисы.
  start         Запустить сервисы и выполнить health checks.
  disk-install  Отформатировать, смонтировать и настроить отдельный диск uploads.
  disk-remove   Отключить disk bind mount и отмонтировать uploads disk.
  doctor        Проверить зависимости, compose config и health сервисов.
  help          Показать эту справку.

Опции:
  --yes                  Автоматически отвечать yes там, где это разрешено.
  --force                Требуется для purge и форматирования диска.
  --no-backup            Пропустить автоматический backup для update/purge/uninstall.
  --backup-dir DIR       Директория для backup.
  --project-dir DIR      Корневая директория проекта.
  --file FILE            Backup archive для restore.
  --device DEV           Disk device для disk-install, например /dev/sdb.
  --mount-point DIR      Mount point, например /srv/messenger/uploads.
  --fs ext4|xfs          Файловая система для disk-install. По умолчанию: ext4.
  --service NAME         Сервис для logs: server, web-client, postgres, redis, localstack, all.
  --tail N               Количество строк logs. По умолчанию: 100.
  --dry-run              Показать планируемые команды без опасных изменений.
  --keep-data            Принимается disk-remove; данные сохраняются по умолчанию.

Примеры:
  ./scripts/messengerctl.sh install
  ./scripts/messengerctl.sh update
  ./scripts/messengerctl.sh backup
  ./scripts/messengerctl.sh restore --file backups/messenger-backup-20260531-120000.tar.gz
  ./scripts/messengerctl.sh uninstall
  ./scripts/messengerctl.sh purge --force
  ./scripts/messengerctl.sh disk-install --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --force
  ./scripts/messengerctl.sh disk-remove --mount-point /srv/messenger/uploads
  ./scripts/messengerctl.sh logs --service server --tail 200
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --yes) YES=true; shift ;;
      --force) FORCE=true; shift ;;
      --no-backup) NO_BACKUP=true; shift ;;
      --dry-run) DRY_RUN=true; shift ;;
      --keep-data) KEEP_DATA=true; shift ;;
      --backup-dir) BACKUP_DIR="${2:-}"; shift 2 ;;
      --project-dir) PROJECT_DIR="${2:-}"; shift 2 ;;
      --file) BACKUP_FILE="${2:-}"; shift 2 ;;
      --device) DEVICE="${2:-}"; shift 2 ;;
      --mount-point) MOUNT_POINT="${2:-}"; shift 2 ;;
      --fs) FS_TYPE="${2:-}"; shift 2 ;;
      --service) SERVICE="${2:-}"; shift 2 ;;
      --tail) TAIL="${2:-}"; shift 2 ;;
      *) die "Unknown option: $1" ;;
    esac
  done
}

main() {
  parse_args "$@"
  detect_project_dir
  case "$COMMAND" in
    install) cmd_install ;;
    update) cmd_update ;;
    backup) create_backup_archive ;;
    restore) cmd_restore ;;
    uninstall) cmd_uninstall ;;
    purge) cmd_purge ;;
    status) cmd_status ;;
    logs) cmd_logs ;;
    restart) cmd_restart ;;
    stop) cmd_stop ;;
    start) cmd_start ;;
    disk-install) install_disk ;;
    disk-remove) remove_disk ;;
    doctor) doctor ;;
    help|-h|--help) cmd_help ;;
    *) cmd_help; die "Unknown command: $COMMAND" ;;
  esac
}

main "$@"
