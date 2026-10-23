# SculWave Self-Hosting on a Linux Server

This guide describes deploying SculWave on a Linux server using Docker Compose. Commands use a dedicated server deployment directory (`/opt/sculwave`) rather than a desktop or development-machine path. If you choose a different directory, replace `/opt/sculwave` consistently in commands and backup instructions.

## 1. Server layout

Use a predictable layout:

```text
/opt/sculwave/                 # Application deployment root
├── .env                       # Secrets and deployment configuration (private)
├── .env.example               # Example environment variables
├── docker-compose.selfhost.yml
├── Dockerfile
├── docker/
│   └── livekit/
│       └── livekit.selfhost.yaml
├── app/, server/, prisma/     # Application source directories
└── data/
    └── media/                 # Uploaded media persisted on the host

/var/backups/sculwave/         # Database and media backups (outside deployment root)
```

The exact source tree can differ by release. Keep the files from the same SculWave revision together; do not create the illustrative source folders manually if they are not present in your checkout.

The Compose file uses relative paths for bind mounts, so run Compose from `/opt/sculwave` or always pass `--project-directory /opt/sculwave`.

## 2. Requirements

- A supported Linux server with Docker Engine and the Docker Compose plugin.
- SSH access and sufficient disk space for Docker images, PostgreSQL, Redis, logs, and uploaded media.
- For public access: a domain, DNS pointing to the server, a firewall, and HTTPS/reverse-proxy configuration.
- If voice/WebRTC is used, network access for the media transports required by your LiveKit configuration. WebSocket signaling alone does not carry all voice media.

Install/enable Docker on a systemd-based host if it is not already installed:

```bash
sudo systemctl enable --now docker
docker --version
docker compose version
```

Use your distribution's official Docker installation instructions if Docker is not installed. If your account requires `sudo` for Docker commands, use it consistently.

## 3. Place the application on the server

Choose one deployment method.

### Option A: Clone the repository

```bash
sudo mkdir -p /opt/sculwave
sudo chown "$USER":"$USER" /opt/sculwave
git clone <YOUR_SCULWAVE_REPOSITORY_URL> /opt/sculwave
cd /opt/sculwave
```

Replace the placeholder with the actual repository URL. Do not use the placeholder literally.

### Option B: Upload/extract a source archive

Upload the project archive to the server, then extract it so that `docker-compose.selfhost.yml` is directly inside `/opt/sculwave`:

```bash
sudo mkdir -p /opt/sculwave
sudo chown "$USER":"$USER" /opt/sculwave
tar -xf sculwave-source.tar -C /opt/sculwave
cd /opt/sculwave
```

The extraction command depends on the archive format. For a `.zip` archive, use `unzip`. Check the resulting directory before proceeding:

```bash
pwd
ls -la
test -f docker-compose.selfhost.yml && echo "Compose file found"
test -f .env.example && echo "Environment template found"
```

If extraction created a nested directory, move into that directory or place its contents directly under `/opt/sculwave`. The Compose file and `.env.example` should be in the directory from which you run the commands below.

## 4. Configure environment variables

Create the server's private environment file:

```bash
cd /opt/sculwave
cp .env.example .env
chmod 600 .env
nano .env
```

If `.env` already exists, back it up before editing rather than overwriting it:

```bash
cp .env ".env.backup.$(date +%Y%m%d-%H%M%S)"
chmod 600 .env
nano .env
```

Generate strong secrets on the server:

```bash
openssl rand -hex 24
openssl rand -hex 32
```

Set the required values in `.env` according to the `.env.example` from the exact release you deploy. Common values in this Compose setup include:

| Variable | Purpose |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | PostgreSQL initialization settings. This setup commonly uses the `sculwave` role and database. |
| `DATABASE_URL` | App connection string. Inside Compose, the database hostname is `postgres`, not `localhost`. Keep its credentials synchronized with the actual database role. |
| `APP_BIND`, `APP_PORT` | Host interface and port for the dashboard. For a reverse proxy on the same server, loopback binding is often appropriate. |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Credentials that must match the LiveKit server configuration and app configuration. |
| `LIVEKIT_BIND`, `LIVEKIT_PUB_URL` | Host binding and client-facing LiveKit URL. The client-facing URL must be reachable from each client device. |
| `MEDIA_STORAGE_DIR` | Media path inside the app container; this setup uses `/app/data/media`. |

Treat the actual `.env.example` and `docker-compose.selfhost.yml` as authoritative if names or defaults differ in your revision. Never commit or publicly share `.env`.

**Important:** `POSTGRES_PASSWORD` is applied when PostgreSQL first initializes its data directory. Changing the value in `.env` does not change the password inside an already-initialized database.

## 5. Check the server deployment configuration

From the deployment root:

```bash
cd /opt/sculwave
docker compose -f docker-compose.selfhost.yml config --quiet
```

Review the Compose file before exposing services publicly. PostgreSQL and Redis should generally remain internal to the Compose network. Keep the app bound to `127.0.0.1` when it will be reached through a local reverse proxy. Do not bind the dashboard to all interfaces unless remote access is deliberately secured.

The optional Caddy service uses the `domain` Compose profile. Enable it only after configuring the domain and the relevant Caddy configuration for this release.

## 6. Build and start SculWave

```bash
cd /opt/sculwave
docker compose -f docker-compose.selfhost.yml up -d --build
docker compose -f docker-compose.selfhost.yml ps
```

Review startup logs:

```bash
docker compose -f docker-compose.selfhost.yml logs --tail=100 app
docker compose -f docker-compose.selfhost.yml logs --tail=100 postgres
docker compose -f docker-compose.selfhost.yml logs --tail=100 redis
docker compose -f docker-compose.selfhost.yml logs --tail=100 livekit
```

Wait for the database and app to initialize. If the app fails to start, resolve the first meaningful error in the logs before repeatedly rebuilding.

## 7. Dashboard access and network exposure

If `APP_BIND` is `127.0.0.1` and the host port is `3000`, the dashboard is available on the server at:

```text
http://127.0.0.1:3000
```

This binding is not directly reachable from another computer. For secure remote access, configure a reverse proxy and HTTPS, or use an SSH tunnel for temporary administration:

```bash
ssh -L 3000:127.0.0.1:3000 <SERVER_USER>@<SERVER_HOST>
```

Then open `http://localhost:3000` on your own computer. Replace the placeholders with your server's SSH username and host.

Do not expose the dashboard publicly over plain HTTP. Configure the self-hosted authentication credentials supported by your deployed revision and use HTTPS for remote access.

## 8. Ports and services

| Service | Typical port | Deployment notes |
|---|---:|---|
| SculWave app | `3000/tcp` | Dashboard/application HTTP endpoint; can be loopback-only behind a reverse proxy. |
| PostgreSQL | `5432/tcp` | Internal Compose service; do not publish publicly. |
| Redis | `6379/tcp` | Internal Compose service; do not publish publicly. |
| LiveKit signaling | `7880/tcp` | HTTP/WebSocket signaling; client-facing URL must be reachable. |
| LiveKit media | Depends on configuration | WebRTC may need UDP, TCP fallback, or TURN. Configure firewall and routing to match LiveKit's settings. |
| Caddy (optional) | `80/tcp`, `443/tcp` | HTTP/HTTPS entry point when the `domain` profile is configured. |

Check a port conflict:

```bash
sudo ss -ltnp | grep ':7880'
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

Identify the owning service before stopping anything. Do not kill `docker-proxy` processes manually. Removing LiveKit media port mappings may make voice calls fail even if signaling connects.

## 9. Persistent data and media uploads

The Compose stack stores PostgreSQL and Redis data in Docker volumes. Network logos/banners are persisted on the host through the media bind mount, typically:

```text
/opt/sculwave/data/media/   # Host path
/app/data/media/            # Path inside the app container
```

The relevant Compose mapping is typically:

```yaml
volumes:
  - ./data/media:/app/data/media
```

Create the host directory if needed:

```bash
cd /opt/sculwave
mkdir -p data/media
```

Uploaded media is separate from the built container image, so rebuilding the app should not remove it when the bind mount is configured correctly. Back up this directory together with the database.

If an upload returns `INVALID_UPLOAD`, inspect the server logs and the upload handler in `server/routes/dashboard/networkMedia.ts`. The frontend's accepted file types must match the server-side allowlist and multipart limits. Do not disable server-side validation as a workaround.

## 10. Routine administration

Run all commands from `/opt/sculwave`.

### Status and logs

```bash
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml logs -f app
docker compose -f docker-compose.selfhost.yml logs -f livekit
```

Press `Ctrl+C` to stop following logs; this does not stop the services.

### Start and stop

```bash
docker compose -f docker-compose.selfhost.yml up -d
docker compose -f docker-compose.selfhost.yml stop
docker compose -f docker-compose.selfhost.yml start
```

### Rebuild after updating code

```bash
docker compose -f docker-compose.selfhost.yml up -d --build
```

Force container recreation after environment or Compose changes:

```bash
docker compose -f docker-compose.selfhost.yml up -d --build --force-recreate
```

For a clean app image rebuild:

```bash
docker compose -f docker-compose.selfhost.yml build --no-cache app
docker compose -f docker-compose.selfhost.yml up -d --force-recreate app
```

### Restart only the app

```bash
docker compose -f docker-compose.selfhost.yml restart app
```

If `.env` values changed, use `up -d --force-recreate app` instead of only restarting.

## 11. Backups

Store backups outside `/opt/sculwave` so replacing the application directory does not also erase them:

```bash
sudo mkdir -p /var/backups/sculwave
sudo chown "$USER":"$USER" /var/backups/sculwave
chmod 700 /var/backups/sculwave
cd /opt/sculwave
```

### Database backup

```bash
docker compose -f docker-compose.selfhost.yml exec -T postgres pg_dump -U sculwave -d sculwave > "/var/backups/sculwave/db-$(date +%Y%m%d-%H%M%S).sql"
```

Adjust the database role/name if `.env` uses different values. Confirm the file exists and is non-empty:

```bash
ls -lh /var/backups/sculwave
```

### Media backup

```bash
tar -czf "/var/backups/sculwave/media-$(date +%Y%m%d-%H%M%S).tar.gz" -C /opt/sculwave data/media
```

Copy backups to a separate machine or backup service. Backups on the same disk do not protect against disk loss.

### Restore overview

Take a backup of the current database first and verify the target. To import a plain SQL dump:

```bash
cat /var/backups/sculwave/YOUR_BACKUP.sql | docker compose -f docker-compose.selfhost.yml exec -T postgres psql -U sculwave -d sculwave
```

Restore media to `/opt/sculwave/data/media` so it maps to `/app/data/media` in the app container. Database records and media files should be restored from compatible backup points.

## 12. Troubleshooting

### Database authentication error (`P1000`)

Check that `DATABASE_URL` matches the actual PostgreSQL role password. Editing `POSTGRES_PASSWORD` does not update an existing database volume. Change the PostgreSQL role password through an authorized database session, then update the app configuration and recreate the app container.

### Missing database column (`P2022`)

The deployed application and database schema/migrations may be out of sync. Check app logs and migration status. Do not delete the database volume as a first troubleshooting step.

### Port already allocated

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
sudo ss -ltnp | grep ':PORT_NUMBER'
```

Identify the process/container that owns the port and change the deployment mapping or stop only a confirmed obsolete service.

### App container restarts repeatedly

```bash
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml logs --tail=200 app
```

### Dashboard redirects to login

An unauthenticated request to `/dashboard` may redirect to `/login`. Sign in using the configured self-hosted credentials. If the redirect persists after signing in, inspect browser network requests and app logs.

### LiveKit signaling works but voice does not

Verify the client-facing LiveKit URL, credentials, HTTPS/secure context for remote browsers, firewall rules, and the WebRTC media transports required by your LiveKit configuration.

## 13. Destructive database reset — use only intentionally

Deleting the PostgreSQL volume permanently deletes database records. First identify the exact volume:

```bash
docker volume ls
docker compose -f docker-compose.selfhost.yml down
docker volume rm <EXACT_POSTGRES_VOLUME_NAME>
docker compose -f docker-compose.selfhost.yml up -d --build
```

Replace the placeholder with the exact volume name. Do not run `docker compose down -v` casually: it may delete all Compose-managed volumes, including Redis data. Verify a usable backup before any destructive operation.

## 14. Server security checklist

- Keep `/opt/sculwave/.env` private (`chmod 600`) and out of version control.
- Use unique, strong passwords/secrets for PostgreSQL, dashboard authentication, and LiveKit.
- Keep PostgreSQL and Redis unpublished to the public network.
- Prefer loopback binding plus a configured HTTPS reverse proxy for public dashboard access.
- Configure the firewall to expose only the ports needed for SSH, HTTPS, and the actual LiveKit signaling/media setup.
- Keep the operating system and Docker packages patched.
- Back up both the database and `/opt/sculwave/data/media`; test restoration periodically.
- Never delete Docker volumes to solve routine build or startup issues.

## Project files to know

- `/opt/sculwave/docker-compose.selfhost.yml` — service definitions, ports, mounts, and volumes.
- `/opt/sculwave/.env.example` — environment variable template for the deployed revision.
- `/opt/sculwave/.env` — private server configuration.
- `/opt/sculwave/docker/livekit/livekit.selfhost.yaml` — LiveKit configuration.
- `/opt/sculwave/server/routes/dashboard/networkMedia.ts` — upload handler.
- `/opt/sculwave/server/routes/mediaFiles.ts` — local media serving.
- `/opt/sculwave/prisma/schema.prisma` and `/opt/sculwave/prisma/migrations/` — database schema and migrations.
