# Deploy BC VenWolf Relay

The relay must be reachable from both sides:

```text
A VenWolf -> Relay public URL
B BC userscript -> Relay public URL
```

It does not need a database. Sessions live in memory and disappear when the host
disconnects or the service restarts.

## Recommended: Render

1. Push this repository to GitHub.
2. Open <https://dashboard.render.com/blueprints>.
3. Click `New Blueprint Instance`.
4. Select `QAQMOON/-BC-VenWolf-Adapter`.
5. Render reads `render.yaml` and creates `bc-venwolf-relay`.
6. After deploy, copy the service URL, for example:

```text
https://bc-venwolf-relay.onrender.com
```

Use that URL in VenWolf `Game Connection -> BC Remote Share`.

Render free services may sleep when idle. If the first connection fails, wait for
the service to wake up and click `Create Code` again.

## Docker / VPS

```text
cd relay-server
docker build -t bc-venwolf-relay .
docker run -d --name bc-venwolf-relay -p 8787:8787 bc-venwolf-relay
```

Then put a reverse proxy such as Caddy, nginx, or Cloudflare Tunnel in front of
the service so users can access it through HTTPS:

```text
https://relay.example.com
```

## Railway / Fly.io / Koyeb

Create a Node.js service using this folder as the app root:

```text
relay-server
```

Build command:

```text
npm ci
```

Start command:

```text
npm start
```

Health check:

```text
/healthz
```

Environment:

```text
HOST=0.0.0.0
SESSION_TTL_MS=3600000
MAX_SESSION_TTL_MS=86400000
ACK_TIMEOUT_MS=5000
MIN_FIRE_INTERVAL_MS=100
CODE_LENGTH=6
```

Most platforms inject `PORT` automatically. Do not hard-code it unless the
platform asks for it.

## Quick Smoke Test

After deploy:

```text
GET https://your-relay.example.com/healthz
```

Expected response:

```json
{
  "ok": true,
  "code": "OK",
  "sessions": 0
}
```
