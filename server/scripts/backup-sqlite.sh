#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DB_PATH="${DB_PATH:-$ROOT_DIR/data/swap.db}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/sqlite}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_PATH="$BACKUP_DIR/swap-$STAMP.db"

if [ ! -f "$DB_PATH" ]; then
  echo "SQLite database not found: $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_PATH"

if command -v shasum >/dev/null 2>&1; then
  shasum "$DB_PATH" "$BACKUP_PATH"
elif command -v sha1sum >/dev/null 2>&1; then
  sha1sum "$DB_PATH" "$BACKUP_PATH"
fi

find "$BACKUP_DIR" -name 'swap-*.db' -type f -mtime +"$RETENTION_DAYS" -delete

echo "Backup written: $BACKUP_PATH"
