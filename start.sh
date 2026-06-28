#!/usr/bin/env bash
# Replit / generic cloud startup for the MADAS backend.
# Installs the lightweight deps (no torch) and starts the API on $PORT.
set -e

pip install --no-cache-dir -r backend/requirements-light.txt

cd backend
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
