#!/bin/sh
set -e

# Render tells the app which port to use through $PORT
PORT="${PORT:-10000}"
sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

php artisan config:cache

# Create or update the tables. Retry a few times in case the database is still starting.
for i in 1 2 3 4 5; do
  php artisan migrate --force && break
  echo "Database not ready, retrying in 5 seconds..."
  sleep 5
done

exec apache2-foreground
