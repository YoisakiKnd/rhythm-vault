#!/usr/bin/env bash
# Postgres 自定义格式备份，按日命名，默认保留 14 天。
# cron 示例（每天 03:15）：
#   15 3 * * * /opt/rhythm-vault/scripts/backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEEP_DAYS="${KEEP_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-$ROOT/.env}"
STAMP="$(date +%Y%m%d)"
OUT="$BACKUP_DIR/rhythm_vault_${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T db \
	pg_dump -U rv -Fc rhythm_vault > "$OUT"

find "$BACKUP_DIR" -name 'rhythm_vault_*.dump' -mtime +"$KEEP_DAYS" -delete
echo "wrote $OUT"
