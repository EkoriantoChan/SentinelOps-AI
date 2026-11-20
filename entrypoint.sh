#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  eval $(node -e '
    try {
      const u = new URL(process.env.DATABASE_URL);
      console.log("export DB_TYPE=postgresdb");
      console.log("export DB_POSTGRESDB_HOST=" + u.hostname);
      console.log("export DB_POSTGRESDB_PORT=" + (u.port || "5432"));
      console.log("export DB_POSTGRESDB_USER=" + u.username);
      console.log("export DB_POSTGRESDB_PASSWORD=" + JSON.stringify(decodeURIComponent(u.password)));
      console.log("export DB_POSTGRESDB_DATABASE=" + u.pathname.replace(/^\//, ""));
      console.log("export DB_POSTGRESDB_SCHEMA=public");
      console.log("export DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false");
    } catch (e) {
      console.error("Failed to parse DATABASE_URL:", e.message);
    }
  ')
fi

exec /docker-entrypoint.sh "$@"
