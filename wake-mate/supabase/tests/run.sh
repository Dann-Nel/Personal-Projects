#!/usr/bin/env bash
# Runs the migrations plus behavioural tests on a throwaway local Postgres database.
# The `auth` schema is a minimal stub, NOT real Supabase: pg_cron, PostgREST and Supabase's
# default grants are not exercised. Needs a running Postgres and a superuser (default: sudo -u postgres).
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="${PSQL:-sudo -u postgres psql -q -v ON_ERROR_STOP=1}"
DB=wm_test
$PSQL -c "drop database if exists $DB" -c "create database $DB"
for f in tests/stub_auth.sql migrations/001_init.sql migrations/002_hardening.sql; do $PSQL -d $DB < "$f"; done
$PSQL -d $DB < tests/matching.test.sql 2>&1 | grep -E "ok:|FAIL|ERROR"
echo "--- permission checks (each should report 'permission denied') ---"
sudo -u postgres psql -q -d $DB < tests/permissions.test.sql 2>&1 | grep -E "denied" || true
