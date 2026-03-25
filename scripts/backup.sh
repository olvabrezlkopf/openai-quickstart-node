#!/bin/bash
# PostgreSQL backup script — run via cron daily at 03:00
# Crontab: 0 3 * * * /opt/my-llm-proxy/scripts/backup.sh

BACKUP_DIR="/backup/postgres"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="llmproxy"
DB_USER="proxy"

mkdir -p "$BACKUP_DIR"

# Dump via Docker
docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Remove old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: ${DB_NAME}_${TIMESTAMP}.sql.gz"
