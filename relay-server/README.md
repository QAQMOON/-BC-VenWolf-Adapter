# BC VenWolf Relay Server

Short-code relay for remote BC VenWolf sessions.

```text
B browser userscript -> Relay share code -> A VenWolf -> A local Coyote/DG-Lab device
```

The relay does not connect to A's computer directly. A opens a WebSocket connection
to the relay, receives a short share code, and B can send limited `fire` requests
to that code.

## Run Locally

```text
npm install
npm start
```

Default URL:

```text
http://127.0.0.1:8787
```

For real remote use, deploy this folder to a public Node.js host such as a VPS,
Render, Railway, or Fly.io, then use the public `https://...` URL in VenWolf and
the BC userscript.

## API

Host WebSocket:

```text
GET /ws/host
```

Sender fire request:

```text
POST /api/v1/sessions/{shareCode}/fire
Content-Type: application/json

{
  "strength": 20,
  "time": 3000,
  "override": true,
  "pulseId": ""
}
```

Health check:

```text
GET /healthz
```

## Environment

```text
PORT=8787
HOST=0.0.0.0
SESSION_TTL_MS=3600000
MAX_SESSION_TTL_MS=86400000
ACK_TIMEOUT_MS=5000
MIN_FIRE_INTERVAL_MS=100
CODE_LENGTH=6
```
