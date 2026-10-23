# SculWave Server Environment Notes

The deployed revision's `/opt/sculwave/.env.example` and `/opt/sculwave/docker-compose.selfhost.yml` are authoritative. This file explains the main settings, but variable names/defaults may change between revisions.

## Server paths

- Deployment root: `/opt/sculwave/`
- Private environment file: `/opt/sculwave/.env`
- Host media directory: `/opt/sculwave/data/media/`
- Media directory inside app container: `/app/data/media/`
- Suggested backup directory: `/var/backups/sculwave/`

If using a different deployment root, update all paths and ensure Compose is run from the correct project directory.

## Important settings

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: PostgreSQL initialization settings.
- `DATABASE_URL`: app's database connection string. Use Compose service hostname `postgres`, not `localhost`, from inside the app container.
- `APP_BIND`, `APP_PORT`: host interface and dashboard port. Loopback binding is useful when a reverse proxy runs on the same server.
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`: must match the LiveKit server configuration and app runtime.
- `LIVEKIT_BIND`, `LIVEKIT_PUB_URL`: LiveKit bind address and URL reachable from client devices.
- `MEDIA_STORAGE_DIR`: path inside the app container; this setup uses `/app/data/media`.

## Secret handling

```bash
cd /opt/sculwave
chmod 600 .env
openssl rand -hex 24
openssl rand -hex 32
```

Keep `.env` out of version control, backups shared without encryption, and support logs. Rotate exposed secrets promptly.

## PostgreSQL password changes

The `POSTGRES_PASSWORD` environment variable initializes the database password when the data directory is first created. For an existing volume, change the PostgreSQL role password through an authorized database session, then update `.env` and recreate the app container. Do not delete the volume just to change a password.
