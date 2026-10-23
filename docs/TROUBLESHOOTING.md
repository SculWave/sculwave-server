# SculWave Server Troubleshooting

Run commands from `/opt/sculwave` unless a command shows an absolute path. Replace that path if your deployment root differs.

## Check status and logs

```bash
cd /opt/sculwave
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml logs --tail=200 app
docker compose -f docker-compose.selfhost.yml logs --tail=100 postgres
docker compose -f docker-compose.selfhost.yml logs --tail=100 livekit
```

## PostgreSQL authentication error (`P1000`)

The password in `.env` may not match the password stored inside the existing PostgreSQL data volume. `POSTGRES_PASSWORD` is used during initial database creation; changing it later does not update an existing role.

- Confirm `DATABASE_URL` and the actual database role password match.
- If you can connect as an authorized role, update the database role password with `\password sculwave` in `psql`.
- Update `.env`, then recreate the app container:

```bash
docker compose -f docker-compose.selfhost.yml up -d --force-recreate app
docker compose -f docker-compose.selfhost.yml logs --tail=100 app
```

Do not delete the database volume merely to change a password.

## Port conflict

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
sudo ss -ltnp | grep ':PORT_NUMBER'
```

Find which process/container owns the port. Stop it only if it is confirmed obsolete, or change the host-side mapping in Compose. Do not kill `docker-proxy` manually.

## Upload returns `INVALID_UPLOAD`

```bash
cd /opt/sculwave
rg -n -C 12 'INVALID_UPLOAD|Multipart parsing failed|Failed to save image' server/routes/dashboard/networkMedia.ts
docker compose -f docker-compose.selfhost.yml logs --tail=150 app
```

Confirm the multipart field name expected by the handler, file-size limit, multipart field/part limits, and server-side MIME allowlist. Keep content validation enabled.

## App repeatedly restarts

```bash
docker compose -f docker-compose.selfhost.yml ps
docker compose -f docker-compose.selfhost.yml logs --tail=200 app
```

Resolve the first meaningful startup error. A rebuild does not fix missing environment values, database authentication errors, or schema mismatch by itself.

## Missing database column (`P2022`)

The deployed app version and database schema/migrations may be out of sync. Check migration output and `prisma/schema.prisma`. Back up the database before applying schema repair or migration procedures.

## LiveKit starts but voice fails

WebSocket signaling is not the complete WebRTC media path. Check the public/client-facing LiveKit URL, credentials, HTTPS/secure context, firewall, UDP/TCP media ports, and TURN requirements for the actual deployment.

## Reset PostgreSQL (destructive)

Only when you intend to erase all database data and have a verified backup:

```bash
docker compose -f docker-compose.selfhost.yml down
docker volume ls
docker volume rm <EXACT_POSTGRES_VOLUME_NAME>
docker compose -f docker-compose.selfhost.yml up -d --build
```

Use the exact volume name. `docker compose down -v` can remove multiple Compose-managed volumes and should not be used casually.
