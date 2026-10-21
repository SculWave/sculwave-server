# SculWave Self-Hosted

A self-hosted SculWave instance with a local administration dashboard. The marketing homepage, browser voice client, hosted sign-in, billing, and legal/pricing pages have been removed. The root URL redirects to the local dashboard sign-in.

## Run with Docker Compose

1. Copy `.env.example` to `.env`.
2. Set `DASHBOARD_USERNAME` and a unique `DASHBOARD_PASSWORD` (at least 14 characters), set a strong `POSTGRES_PASSWORD`, and generate a LiveKit key pair for `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`. Generate a password with `openssl rand -base64 32`.
3. Start the stack:

```bash
docker compose -f docker-compose.selfhost.yml up -d --build
```

4. Open [http://localhost:3000](http://localhost:3000).

The dashboard requires the local username and password from `.env`. Successful login creates an HttpOnly, SameSite=Strict session cookie that expires after 12 hours; failed attempts are rate-limited. Keep `.env` private (`chmod 600 .env`) and keep the default `APP_BIND=127.0.0.1`. If remote access is needed, use HTTPS, set `COOKIE_SECURE=true`, and restrict network access. Do not expose an unauthenticated infrastructure API or dashboard directly to the public internet.

## Local development

```bash
npm ci
cp .env.example .env
npm run build
npm start
```

The app requires PostgreSQL, Redis, and LiveKit as configured in `.env`. See `.env.example` and `docker-compose.selfhost.yml` for the supported self-hosted setup.
