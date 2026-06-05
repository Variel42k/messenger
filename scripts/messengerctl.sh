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
RUNTIME="docker"
PROFILE="dev"
COMPOSE_FILE=""
NAMESPACE="messenger"
RELEASE="messenger"
VALUES_FILE=""
CLUSTER_ID=""
CLUSTER_NAME=""
CLUSTER_URL=""
PEER_FILE=""
FEDERATION_DIR="deploy/federation"
FEDERATION_CLUSTER_FILE=""
FEDERATION_PEERS_FILE=""

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

container_engine() {
  case "$RUNTIME" in
    docker) printf 'docker\n' ;;
    podman) printf 'podman\n' ;;
    kubernetes) die "Container engine commands are not used for --runtime kubernetes" ;;
    *) die "Unsupported runtime: $RUNTIME" ;;
  esac
}

compose_command() {
  case "$RUNTIME" in
    docker)
      if [[ "$DRY_RUN" != "true" ]]; then
        command -v docker >/dev/null 2>&1 || die "docker is required for --runtime docker"
        docker compose version >/dev/null 2>&1 || die "Docker Compose plugin is required for --runtime docker"
      fi
      printf 'docker compose\n'
      ;;
    podman)
      if [[ "$DRY_RUN" == "true" ]] && ! command -v podman >/dev/null 2>&1 && ! command -v podman-compose >/dev/null 2>&1; then
        printf 'podman compose\n'
        return 0
      fi
      command -v podman >/dev/null 2>&1 || die "podman is required for --runtime podman"
      if podman compose version >/dev/null 2>&1; then
        printf 'podman compose\n'
      elif command -v podman-compose >/dev/null 2>&1; then
        printf 'podman-compose\n'
      else
        die "podman compose or podman-compose is required for --runtime podman"
      fi
      ;;
    kubernetes)
      die "Compose command is not available for --runtime kubernetes"
      ;;
    *) die "Unsupported runtime: $RUNTIME" ;;
  esac
}

selected_compose_file() {
  if [[ -n "$COMPOSE_FILE" ]]; then
    printf '%s\n' "$COMPOSE_FILE"
    return 0
  fi
  if [[ "$PROFILE" == "production" ]]; then
    case "$RUNTIME" in
      docker)
        if [[ -f "$PROJECT_DIR/docker-compose.production.yml" ]]; then
          printf '%s\n' "$PROJECT_DIR/docker-compose.production.yml"
        else
          log_warn "docker-compose.production.yml not found; using docker-compose.production.yml.example"
          printf '%s\n' "$PROJECT_DIR/docker-compose.production.yml.example"
        fi
        ;;
      podman)
        if [[ -f "$PROJECT_DIR/podman-compose.production.yml" ]]; then
          printf '%s\n' "$PROJECT_DIR/podman-compose.production.yml"
        else
          log_warn "podman-compose.production.yml not found; using podman-compose.production.yml.example"
          printf '%s\n' "$PROJECT_DIR/podman-compose.production.yml.example"
        fi
        ;;
      *) die "Compose file selection is not available for --runtime $RUNTIME" ;;
    esac
  else
    printf '%s\n' "$PROJECT_DIR/docker-compose.yml"
  fi
}

compose_args() {
  local cmd compose_file
  cmd="$(compose_command)"
  compose_file="$(selected_compose_file)"
  # shellcheck disable=SC2206
  local args=($cmd)
  if [[ "$RUNTIME" == "docker" ]]; then
    args+=(--project-directory "$PROJECT_DIR")
  fi
  args+=(-f "$compose_file")
  if [[ -f "$PROJECT_DIR/$DISK_COMPOSE_FILE" ]]; then
    args+=(-f "$PROJECT_DIR/$DISK_COMPOSE_FILE")
  fi
  printf '%s\n' "${args[@]}"
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
  FEDERATION_CLUSTER_FILE="$PROJECT_DIR/$FEDERATION_DIR/cluster.yml"
  FEDERATION_PEERS_FILE="${PEER_FILE:-$PROJECT_DIR/$FEDERATION_DIR/peers.yml}"
}

compose() {
  local args=()
  mapfile -t args < <(compose_args)
  run_cmd "${args[@]}" "$@"
}

compose_capture() {
  local args=()
  mapfile -t args < <(compose_args)
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
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would check backend health: $url"
    return 0
  fi
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
  local engine
  engine="$(container_engine)"
  "$engine" exec messenger-postgres pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-messenger}" >/dev/null 2>&1
}

check_redis() {
  local engine
  engine="$(container_engine)"
  [[ "$("$engine" exec messenger-redis redis-cli ping 2>/dev/null || true)" == "PONG" ]]
}

check_localstack() {
  local engine
  engine="$(container_engine)"
  "$engine" exec messenger-localstack awslocal s3 ls >/dev/null 2>&1 || "$engine" exec messenger-localstack curl -fsS http://localhost:4566/_localstack/health >/dev/null 2>&1
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
  local engine
  engine="$(container_engine)"
  log_info "Backing up PostgreSQL"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write PostgreSQL dump to $dest"
    return 0
  fi
  if ! "$engine" ps --format '{{.Names}}' | grep -qx 'messenger-postgres'; then
    compose up -d postgres
  fi
  "$engine" exec -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-messenger}" > "$dest"
}

restore_postgres() {
  local dump="$1"
  local engine
  engine="$(container_engine)"
  [[ -f "$dump" ]] || die "PostgreSQL dump not found in backup"
  log_warn "Restoring PostgreSQL will overwrite current database contents."
  confirm "Restore PostgreSQL database from backup?" || die "Restore cancelled"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would restore PostgreSQL from $dump"
    return 0
  fi
  compose up -d postgres
  sleep 5
  "$engine" exec -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    psql -U "${POSTGRES_USER:-postgres}" -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB:-messenger}' AND pid <> pg_backend_pid();" >/dev/null
  "$engine" exec -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    dropdb -U "${POSTGRES_USER:-postgres}" --if-exists "${POSTGRES_DB:-messenger}"
  "$engine" exec -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
    createdb -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-messenger}"
  "$engine" exec -i -e PGPASSWORD="${POSTGRES_PASSWORD:-password}" messenger-postgres \
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
  local engine
  engine="$(container_engine)"
  host_path="$(disk_source_path || true)"
  log_info "Backing up uploads"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write uploads archive to $dest"
    return 0
  fi
  if [[ -n "$host_path" && -d "$host_path" ]]; then
    tar -czf "$dest" -C "$host_path" .
  else
    "$engine" run --rm -v "$(volume_name files_data):/data:ro" -v "$(dirname "$dest"):/backup" alpine:3.20 \
      sh -c "cd /data && tar -czf /backup/$(basename "$dest") ."
  fi
}

backup_localstack() {
  local dest="$1"
  local engine
  engine="$(container_engine)"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write LocalStack archive to $dest"
    return 0
  fi
  "$engine" run --rm -v "$(volume_name localstack_data):/data:ro" -v "$(dirname "$dest"):/backup" alpine:3.20 \
    sh -c "cd /data && tar -czf /backup/$(basename "$dest") ." || log_warn "LocalStack backup skipped"
}

backup_redis() {
  local dest="$1"
  local engine
  engine="$(container_engine)"
  log_info "Backing up Redis volume"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write Redis archive to $dest"
    return 0
  fi
  "$engine" run --rm -v "$(volume_name redis_data):/data:ro" -v "$(dirname "$dest"):/backup" alpine:3.20 \
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
    "$(container_engine)" ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || true
    printf '\n[docker compose ps]\n'
    compose_capture ps 2>/dev/null || true
  } > "$dest"
}

create_backup_archive() {
  require_command tar
  require_command gzip
  require_command "$(container_engine)"
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
  local engine
  engine="$(container_engine)"
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
    "$engine" run --rm -v "$(volume_name files_data):/data" -v "$(dirname "$archive"):/backup" alpine:3.20 \
      sh -c "rm -rf /data/* /data/.[!.]* /data/..?* 2>/dev/null || true; tar -xzf /backup/$(basename "$archive") -C /data"
  fi
}

list_disks() {
  require_command lsblk
  lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL
}

disk_status() {
  log_info "Disk storage compose file: $PROJECT_DIR/$DISK_COMPOSE_FILE"
  if [[ -f "$PROJECT_DIR/$DISK_COMPOSE_FILE" ]]; then
    sed -n '1,120p' "$PROJECT_DIR/$DISK_COMPOSE_FILE"
  else
    log_warn "$DISK_COMPOSE_FILE not found"
  fi
  local host_path=""
  host_path="$(disk_source_path || true)"
  if [[ -n "$host_path" ]]; then
    log_info "Configured uploads host path: $host_path"
    if command -v findmnt >/dev/null 2>&1; then
      findmnt "$host_path" || log_warn "$host_path is not a mount point"
    fi
    [[ -d "$host_path" ]] && du -sh "$host_path" || log_warn "$host_path does not exist"
  fi
  if [[ -f "$ENV_FILE" ]]; then
    grep -E '^(STORAGE_PROVIDER|STORAGE_DISK_PATH)=' "$ENV_FILE" || true
  fi
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
  if [[ "$DRY_RUN" == "true" ]]; then
    command -v lsblk >/dev/null 2>&1 && list_disks || log_warn "lsblk is not available; skipping disk list in dry-run"
    log_info "Would verify block device: $DEVICE"
    log_info "Would verify device is not mounted"
    log_info "Would format $DEVICE as $FS_TYPE only with --force and confirmation"
    log_info "Would mount $DEVICE at $MOUNT_POINT and add /etc/fstab entry by UUID"
    write_compose_override_for_disk "$MOUNT_POINT"
    set_env_var "STORAGE_PROVIDER" "disk"
    set_env_var "STORAGE_DISK_PATH" "/data/uploads"
    compose up -d server worker
    wait_for_health
    return 0
  fi
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
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would verify mount point: $MOUNT_POINT"
    compose stop
    log_info "Would create uploads backup before disk removal"
    log_info "Would disable $DISK_COMPOSE_FILE"
    log_info "Would comment /etc/fstab entry and unmount $MOUNT_POINT"
    compose up -d
    wait_for_health
    return 0
  fi
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

ensure_federation_dir() {
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would create $PROJECT_DIR/$FEDERATION_DIR"
  else
    mkdir -p "$PROJECT_DIR/$FEDERATION_DIR"
  fi
}

yaml_quote() {
  printf '%s' "$1" | sed 's/"/\\"/g'
}

federation_init() {
  [[ -n "$CLUSTER_ID" ]] || die "federation-init requires --cluster-id"
  [[ -n "$CLUSTER_URL" ]] || die "federation-init requires --cluster-url"
  local name="${CLUSTER_NAME:-$CLUSTER_ID}"
  ensure_federation_dir
  log_warn "Federation commands prepare topology/trust inventory and health validation only; backend federation protocol is not implemented here."
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would write $FEDERATION_CLUSTER_FILE and $FEDERATION_PEERS_FILE"
    return 0
  fi
  cat > "$FEDERATION_CLUSTER_FILE" <<EOF
cluster:
  id: "$(yaml_quote "$CLUSTER_ID")"
  name: "$(yaml_quote "$name")"
  url: "$(yaml_quote "$CLUSTER_URL")"
  mode: "config-topology-validation-only"
  healthEndpoint: "/actuator/health"
EOF
  if [[ ! -f "$FEDERATION_PEERS_FILE" ]]; then
    cat > "$FEDERATION_PEERS_FILE" <<'EOF'
peers: []
EOF
  fi
  log_info "Federation cluster inventory created: $FEDERATION_CLUSTER_FILE"
}

federation_add_peer() {
  [[ -n "$CLUSTER_ID" ]] || die "federation-add-peer requires --cluster-id"
  [[ -n "$CLUSTER_URL" ]] || die "federation-add-peer requires --cluster-url"
  local name="${CLUSTER_NAME:-$CLUSTER_ID}"
  ensure_federation_dir
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would add peer $CLUSTER_ID -> $CLUSTER_URL to $FEDERATION_PEERS_FILE"
    return 0
  fi
  [[ -f "$FEDERATION_PEERS_FILE" ]] || printf 'peers:\n' > "$FEDERATION_PEERS_FILE"
  if grep -q "id: \"$(yaml_quote "$CLUSTER_ID")\"" "$FEDERATION_PEERS_FILE"; then
    die "Peer already exists: $CLUSTER_ID"
  fi
  cat >> "$FEDERATION_PEERS_FILE" <<EOF
  - id: "$(yaml_quote "$CLUSTER_ID")"
    name: "$(yaml_quote "$name")"
    url: "$(yaml_quote "$CLUSTER_URL")"
    enabled: true
EOF
  log_info "Federation peer added: $CLUSTER_ID"
}

federation_remove_peer() {
  [[ -n "$CLUSTER_ID" ]] || die "federation-remove-peer requires --cluster-id"
  [[ -f "$FEDERATION_PEERS_FILE" ]] || die "Peer file not found: $FEDERATION_PEERS_FILE"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would remove peer $CLUSTER_ID from $FEDERATION_PEERS_FILE"
    return 0
  fi
  local tmp
  tmp="$(mktemp)"
  awk -v id="$CLUSTER_ID" '
    /^  - id: / {
      skip = ($0 ~ "id: \"" id "\"")
    }
    skip && /^  - id: / && $0 !~ "id: \"" id "\"" { skip=0 }
    !skip { print }
  ' "$FEDERATION_PEERS_FILE" > "$tmp"
  mv "$tmp" "$FEDERATION_PEERS_FILE"
  log_info "Federation peer removed if it existed: $CLUSTER_ID"
}

federation_status() {
  log_warn "Federation status is configuration/topology status only; it does not prove message federation."
  if [[ -f "$FEDERATION_CLUSTER_FILE" ]]; then
    log_info "Local cluster:"
    sed -n '1,120p' "$FEDERATION_CLUSTER_FILE"
  else
    log_warn "Cluster file not found: $FEDERATION_CLUSTER_FILE"
  fi
  if [[ -f "$FEDERATION_PEERS_FILE" ]]; then
    log_info "Peers:"
    sed -n '1,200p' "$FEDERATION_PEERS_FILE"
  else
    log_warn "Peer file not found: $FEDERATION_PEERS_FILE"
  fi
}

federation_peer_urls() {
  [[ -f "$FEDERATION_PEERS_FILE" ]] || return 0
  awk -F'"' '/^[[:space:]]+url: "/ { print $2 }' "$FEDERATION_PEERS_FILE"
}

federation_validate() {
  command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 || die "curl or wget is required for federation validation"
  federation_status
  local url health_url failed=0
  while IFS= read -r url; do
    [[ -n "$url" ]] || continue
    health_url="${url%/}/actuator/health"
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "Would validate peer health: $health_url"
      continue
    fi
    if command -v curl >/dev/null 2>&1; then
      curl -fsS "$health_url" >/dev/null && log_info "Peer health OK: $health_url" || { log_warn "Peer health failed: $health_url"; failed=1; }
    else
      wget -qO- "$health_url" >/dev/null && log_info "Peer health OK: $health_url" || { log_warn "Peer health failed: $health_url"; failed=1; }
    fi
  done < <(federation_peer_urls)
  return "$failed"
}

federation_export() {
  log_warn "Export contains topology/trust inventory only; it is not a backend federation protocol bundle."
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would export sanitized federation bundle"
    return 0
  fi
  printf '# Messenger federation inventory export\n'
  printf '# Generated: %s\n\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  [[ -f "$FEDERATION_CLUSTER_FILE" ]] && sed -n '1,120p' "$FEDERATION_CLUSTER_FILE"
  printf '\n'
  [[ -f "$FEDERATION_PEERS_FILE" ]] && sed -n '1,200p' "$FEDERATION_PEERS_FILE"
}

runtime_doctor() {
  case "$RUNTIME" in
    docker)
      require_command docker
      docker info >/dev/null 2>&1 && log_info "Docker daemon is reachable" || log_warn "Docker daemon is not reachable"
      docker compose version >/dev/null 2>&1 && log_info "Docker Compose plugin is available" || log_warn "Docker Compose plugin is missing"
      compose_capture config >/dev/null 2>&1 && log_info "Docker Compose config is valid" || log_warn "Docker Compose config failed"
      ;;
    podman)
      require_command podman
      podman info >/dev/null 2>&1 && log_info "Podman is reachable" || log_warn "Podman is not reachable"
      compose_command >/dev/null && log_info "Podman Compose command is available"
      compose_capture config >/dev/null 2>&1 && log_info "Podman Compose config is valid" || log_warn "Podman Compose config failed"
      ;;
    kubernetes)
      require_command kubectl
      require_command helm
      kubectl version --client >/dev/null 2>&1 && log_info "kubectl client is available" || log_warn "kubectl client check failed"
      helm version >/dev/null 2>&1 && log_info "helm is available" || log_warn "helm check failed"
      if [[ -n "$VALUES_FILE" ]]; then
        helm template "$RELEASE" "$PROJECT_DIR/helm" -n "$NAMESPACE" -f "$VALUES_FILE" >/dev/null && log_info "Helm template is valid" || log_warn "Helm template failed"
      else
        helm template "$RELEASE" "$PROJECT_DIR/helm" -n "$NAMESPACE" >/dev/null && log_info "Helm template is valid" || log_warn "Helm template failed"
      fi
      ;;
    *) die "Unsupported runtime: $RUNTIME" ;;
  esac
}

doctor() {
  local failed=0
  log_info "Project: $PROJECT_DIR"
  for cmd in git openssl tar gzip; do
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
  runtime_doctor || failed=1
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
  if [[ "$RUNTIME" != "kubernetes" ]] && command -v "$(container_engine)" >/dev/null 2>&1 && "$(container_engine)" info >/dev/null 2>&1; then
    log_info "Messenger volumes:"
    "$(container_engine)" volume ls --format '{{.Name}}' | grep -E '(^|_)((postgres|redis|localstack|files)_data)$' || log_warn "No Messenger data volumes found yet"
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
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Would run post-start checks: compose ps, backend health, web-client, PostgreSQL, Redis, LocalStack/S3"
    return 0
  fi
  compose ps
  wait_for_health || return 1
  check_web && log_info "Web client is reachable: $WEB_URL" || log_warn "Web client is not reachable: $WEB_URL"
  check_postgres && log_info "PostgreSQL is ready" || log_warn "PostgreSQL check failed. Logs: $SCRIPT_NAME logs --service postgres --tail 200"
  check_redis && log_info "Redis ping OK" || log_warn "Redis check failed. Logs: $SCRIPT_NAME logs --service redis --tail 200"
  check_localstack && log_info "LocalStack/S3 check OK" || log_warn "LocalStack/S3 check failed. Logs: $SCRIPT_NAME logs --service localstack --tail 200"
}

k8s_values_args() {
  if [[ -n "$VALUES_FILE" ]]; then
    printf '%s\n' -f "$VALUES_FILE"
  elif [[ "$PROFILE" == "production" && -f "$PROJECT_DIR/helm/values-production.example.yaml" ]]; then
    printf '%s\n' -f "$PROJECT_DIR/helm/values-production.example.yaml"
  fi
}

k8s_helm_upgrade() {
  if [[ "$DRY_RUN" != "true" ]]; then
    require_command helm
    require_command kubectl
  fi
  local values=()
  mapfile -t values < <(k8s_values_args)
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "+ kubectl create namespace $NAMESPACE --dry-run=client -o yaml"
    log_info "+ kubectl apply -f -"
  else
    log_info "+ kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -"
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
  fi
  run_cmd helm upgrade --install "$RELEASE" "$PROJECT_DIR/helm" --namespace "$NAMESPACE" "${values[@]}"
}

k8s_status() {
  if [[ "$DRY_RUN" != "true" ]]; then
    require_command kubectl
    require_command helm
  fi
  run_cmd helm status "$RELEASE" --namespace "$NAMESPACE"
  run_cmd kubectl get pods,svc,ingress --namespace "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE"
}

k8s_rollback() {
  require_command helm
  run_cmd helm rollback "$RELEASE" --namespace "$NAMESPACE"
}

k8s_logs() {
  require_command kubectl
  local selector="app.kubernetes.io/instance=$RELEASE"
  run_cmd kubectl logs --namespace "$NAMESPACE" -l "$selector" --tail="$TAIL"
}

cmd_install() {
  if [[ "$RUNTIME" == "kubernetes" ]]; then
    k8s_helm_upgrade
    k8s_status
    return 0
  fi
  if [[ "$DRY_RUN" != "true" ]]; then
    require_command "$(container_engine)"
  fi
  require_command git
  require_command openssl
  require_command tar
  require_command gzip
  command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 || die "curl or wget is required"
  compose_command >/dev/null
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
  if [[ "$RUNTIME" == "kubernetes" ]]; then
    [[ "$NO_BACKUP" == "true" ]] || log_warn "Kubernetes backup is environment-specific; see docs/KUBERNETES.md before update."
    k8s_helm_upgrade
    k8s_status
    return 0
  fi
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
  if [[ "$RUNTIME" == "kubernetes" ]]; then
    k8s_status
    return 0
  fi
  load_env
  compose ps
  wait_for_health "$HEALTH_URL" 1 1 >/dev/null 2>&1 && log_info "Backend health OK" || log_warn "Backend health failed"
  check_web && log_info "Web client reachable" || log_warn "Web client unavailable"
  log_info "STORAGE_PROVIDER=${STORAGE_PROVIDER:-unset}"
  log_info "Container runtime volumes:"
  "$(container_engine)" system df -v 2>/dev/null | sed -n '/Local Volumes space usage:/,$p' || true
  local host_path=""
  host_path="$(disk_source_path || true)"
  [[ -n "$host_path" && -d "$host_path" ]] && du -sh "$host_path" || true
}

cmd_logs() {
  if [[ "$RUNTIME" == "kubernetes" ]]; then
    k8s_logs
    return 0
  fi
  local target=()
  case "$SERVICE" in
    all) target=() ;;
    server|web-client|postgres|redis|localstack|worker|mailhog) target=("$SERVICE") ;;
    *) die "Unknown service: $SERVICE" ;;
  esac
  compose logs --tail "$TAIL" "${target[@]}"
}

cmd_restart() {
  if [[ "$RUNTIME" == "kubernetes" ]]; then
    require_command kubectl
    run_cmd kubectl rollout restart deployment/"$RELEASE" --namespace "$NAMESPACE"
    k8s_status
    return 0
  fi
  compose restart
  post_start_checks
}

cmd_stop() {
  if [[ "$RUNTIME" == "kubernetes" ]]; then
    run_cmd helm uninstall "$RELEASE" --namespace "$NAMESPACE"
    return 0
  fi
  compose stop
}

cmd_start() {
  if [[ "$RUNTIME" == "kubernetes" ]]; then
    k8s_helm_upgrade
    k8s_status
    return 0
  fi
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
  disk-list     Показать диски через lsblk.
  disk-add      Alias для disk-install.
  disk-status   Показать disk storage config и mount status.
  runtime-doctor Проверить выбранный runtime: docker, podman или kubernetes.
  podman-install, podman-update, podman-start, podman-stop
  k8s-install, k8s-update, k8s-status, k8s-start, k8s-stop, k8s-rollback
  federation-init, federation-add-peer, federation-remove-peer
  federation-status, federation-validate, federation-export
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
  --runtime docker|podman|kubernetes  Runtime. По умолчанию: docker.
  --profile dev|production            Профиль deployment. По умолчанию: dev.
  --compose-file FILE                 Явный compose-файл для Docker/Podman.
  --namespace NAMESPACE               Kubernetes namespace. По умолчанию: messenger.
  --release RELEASE                   Helm release. По умолчанию: messenger.
  --values FILE                       Helm values file.
  --cluster-id ID                     Federation cluster/peer id.
  --cluster-name NAME                 Federation cluster/peer display name.
  --cluster-url URL                   Federation cluster/peer base URL.
  --peer-file FILE                    Federation peers file.

Примеры:
  ./scripts/messengerctl.sh install
  ./scripts/messengerctl.sh install --runtime docker --profile production --dry-run
  ./scripts/messengerctl.sh install --runtime podman --profile production --dry-run
  ./scripts/messengerctl.sh install --runtime kubernetes --namespace messenger --release messenger --values helm/values-production.example.yaml --dry-run
  ./scripts/messengerctl.sh update
  ./scripts/messengerctl.sh backup
  ./scripts/messengerctl.sh restore --file backups/messenger-backup-20260531-120000.tar.gz
  ./scripts/messengerctl.sh uninstall
  ./scripts/messengerctl.sh purge --force
  ./scripts/messengerctl.sh disk-install --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --force
  ./scripts/messengerctl.sh disk-add --device /dev/sdb --mount-point /srv/messenger/uploads --fs ext4 --dry-run
  ./scripts/messengerctl.sh disk-remove --mount-point /srv/messenger/uploads
  ./scripts/messengerctl.sh federation-init --cluster-id dev-a --cluster-url https://chat-a.example.com --dry-run
  ./scripts/messengerctl.sh federation-add-peer --cluster-id dev-b --cluster-url https://chat-b.example.com --dry-run
  ./scripts/messengerctl.sh federation-validate --dry-run
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
      --runtime) RUNTIME="${2:-}"; shift 2 ;;
      --profile) PROFILE="${2:-}"; shift 2 ;;
      --compose-file) COMPOSE_FILE="${2:-}"; shift 2 ;;
      --namespace) NAMESPACE="${2:-}"; shift 2 ;;
      --release) RELEASE="${2:-}"; shift 2 ;;
      --values) VALUES_FILE="${2:-}"; shift 2 ;;
      --cluster-id) CLUSTER_ID="${2:-}"; shift 2 ;;
      --cluster-name) CLUSTER_NAME="${2:-}"; shift 2 ;;
      --cluster-url) CLUSTER_URL="${2:-}"; shift 2 ;;
      --peer-file) PEER_FILE="${2:-}"; shift 2 ;;
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
  case "$RUNTIME" in docker|podman|kubernetes) ;; *) die "--runtime must be docker, podman or kubernetes" ;; esac
  case "$PROFILE" in dev|production) ;; *) die "--profile must be dev or production" ;; esac
  case "$COMMAND" in
    install) cmd_install ;;
    podman-install) RUNTIME="podman"; cmd_install ;;
    k8s-install) RUNTIME="kubernetes"; cmd_install ;;
    update) cmd_update ;;
    podman-update) RUNTIME="podman"; cmd_update ;;
    k8s-update) RUNTIME="kubernetes"; cmd_update ;;
    backup) create_backup_archive ;;
    restore) cmd_restore ;;
    uninstall) cmd_uninstall ;;
    purge) cmd_purge ;;
    status) cmd_status ;;
    k8s-status) RUNTIME="kubernetes"; cmd_status ;;
    logs) cmd_logs ;;
    restart) cmd_restart ;;
    stop) cmd_stop ;;
    podman-stop) RUNTIME="podman"; cmd_stop ;;
    k8s-stop) RUNTIME="kubernetes"; cmd_stop ;;
    start) cmd_start ;;
    podman-start) RUNTIME="podman"; cmd_start ;;
    k8s-start) RUNTIME="kubernetes"; cmd_start ;;
    k8s-rollback) RUNTIME="kubernetes"; k8s_rollback ;;
    runtime-doctor) runtime_doctor ;;
    disk-list) list_disks ;;
    disk-add) install_disk ;;
    disk-install) install_disk ;;
    disk-remove) remove_disk ;;
    disk-status) disk_status ;;
    federation-init) federation_init ;;
    federation-add-peer) federation_add_peer ;;
    federation-remove-peer) federation_remove_peer ;;
    federation-status) federation_status ;;
    federation-validate) federation_validate ;;
    federation-export) federation_export ;;
    doctor) doctor ;;
    help|-h|--help) cmd_help ;;
    *) cmd_help; die "Unknown command: $COMMAND" ;;
  esac
}

main "$@"
