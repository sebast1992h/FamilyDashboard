#!/bin/sh
echo "Starting backend with database migration..."

# Warte auf die Datenbank
echo "Waiting for database to be ready..."
until nc -z postgres 5432; do
  echo "Waiting for postgres..."
  sleep 1
done

echo "Database is ready!"

# Führe Prisma-Migration aus
echo "Running Prisma migrations..."
npx prisma migrate deploy

# Generiere Prisma Client (falls noch nicht geschehen)
echo "Generating Prisma client..."
npx prisma generate

# Starte den Server
echo "Starting server..."
node server.js