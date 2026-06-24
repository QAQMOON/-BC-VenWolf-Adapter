import crypto from 'node:crypto';
import http from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const CODE_LENGTH = Number(process.env.CODE_LENGTH || 6);
const DEFAULT_TTL_MS = Number(process.env.SESSION_TTL_MS || 60 * 60 * 1000);
const MAX_TTL_MS = Number(process.env.MAX_SESSION_TTL_MS || 24 * 60 * 60 * 1000);
const ACK_TIMEOUT_MS = Number(process.env.ACK_TIMEOUT_MS || 5000);
const MIN_FIRE_INTERVAL_MS = Number(process.env.MIN_FIRE_INTERVAL_MS || 100);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 32 * 1024);
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const sessions = new Map();

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(body);
}

function makeError(code, message, details) {
  return { ok: false, error: { code, message, ...(details ? { details } : {}) } };
}

function makeCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
    }
    if (!sessions.has(code)) return code;
  }
  throw new Error('Unable to allocate a unique share code');
}

function clampNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(min, Math.min(max, num));
}

function sanitizeFirePayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const strength = clampNumber(input.strength, 0, 200);
  if (strength === null) return null;

  const time = input.time === undefined ? undefined : clampNumber(input.time, 1, 300000);
  if (input.time !== undefined && time === null) return null;

  const payload = {
    strength: Math.round(strength),
    ...(time === undefined ? {} : { time: Math.round(time) }),
    override: input.override === true,
  };

  if (typeof input.pulseId === 'string' && input.pulseId.length <= 128) {
    payload.pulseId = input.pulseId;
  }

  if (input.meta && typeof input.meta === 'object' && !Array.isArray(input.meta)) {
    payload.meta = input.meta;
  }

  return payload;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('BODY_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getSession(code) {
  const normalized = String(code || '').trim().toUpperCase();
  const session = sessions.get(normalized);
  if (!session) return null;
  if (Date.now() >= session.expiresAtMs || session.ws.readyState !== WebSocket.OPEN) {
    closeSession(normalized, 'expired');
    return null;
  }
  return session;
}

function closeSession(code, reason) {
  const session = sessions.get(code);
  if (!session) return;
  sessions.delete(code);
  for (const pending of session.pending.values()) {
    pending.resolve({ ok: false, code: 'SESSION_CLOSED', message: reason || 'Session closed' });
  }
  session.pending.clear();
  if (session.ws.readyState === WebSocket.OPEN) {
    session.ws.close(1000, reason || 'closed');
  }
}

async function forwardFire(code, payload) {
  const session = getSession(code);
  if (!session) {
    return { statusCode: 404, body: makeError('SESSION_NOT_FOUND', 'Share code is invalid, expired, or offline') };
  }

  const now = Date.now();
  if (now - session.lastFireAt < MIN_FIRE_INTERVAL_MS) {
    return { statusCode: 429, body: makeError('RATE_LIMITED', 'Too many fire requests for this session') };
  }
  session.lastFireAt = now;

  const requestId = crypto.randomUUID();
  const ackPromise = new Promise((resolve) => {
    const timer = setTimeout(() => {
      session.pending.delete(requestId);
      resolve({ ok: false, code: 'ACK_TIMEOUT', message: 'Host did not acknowledge the request in time' });
    }, ACK_TIMEOUT_MS);
    session.pending.set(requestId, {
      resolve: (result) => {
        clearTimeout(timer);
        resolve(result);
      },
    });
  });

  session.ws.send(JSON.stringify({ type: 'fire', requestId, payload }));
  const ack = await ackPromise;

  if (ack.ok) {
    session.forwarded += 1;
    return {
      statusCode: 200,
      body: {
        ok: true,
        code: 'OK',
        requestId,
        forwarded: session.forwarded,
        host: ack.host || null,
      },
    };
  }

  return {
    statusCode: ack.code === 'ACK_TIMEOUT' ? 504 : 502,
    body: makeError(ack.code || 'HOST_REJECTED', ack.message || 'Host rejected the request'),
  };
}

async function handleHttp(req, res) {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && requestUrl.pathname === '/healthz') {
    json(res, 200, { ok: true, code: 'OK', sessions: sessions.size });
    return;
  }

  const statusMatch = requestUrl.pathname.match(/^\/api\/v1\/sessions\/([A-Za-z0-9]+)\/status$/);
  if (req.method === 'GET' && statusMatch) {
    const code = statusMatch[1].toUpperCase();
    const session = getSession(code);
    if (!session) {
      json(res, 404, makeError('SESSION_NOT_FOUND', 'Share code is invalid, expired, or offline'));
      return;
    }
    json(res, 200, {
      ok: true,
      code: 'OK',
      session: {
        shareCode: code,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        forwarded: session.forwarded,
      },
    });
    return;
  }

  const fireMatch = requestUrl.pathname.match(/^\/api\/v1\/sessions\/([A-Za-z0-9]+)\/fire$/);
  if (req.method === 'POST' && fireMatch) {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      const code = error.message === 'BODY_TOO_LARGE' ? 'BODY_TOO_LARGE' : 'INVALID_JSON';
      json(res, code === 'BODY_TOO_LARGE' ? 413 : 400, makeError(code, 'Invalid JSON request body'));
      return;
    }

    const payload = sanitizeFirePayload(body);
    if (!payload) {
      json(res, 422, makeError('VALIDATION_ERROR', 'Expected fire payload with numeric strength'));
      return;
    }

    const result = await forwardFire(fireMatch[1].toUpperCase(), payload);
    json(res, result.statusCode, result.body);
    return;
  }

  json(res, 404, makeError('NOT_FOUND', 'Route not found'));
}

function handleHostMessage(ws, raw) {
  let message;
  try {
    message = JSON.parse(String(raw));
  } catch {
    ws.send(JSON.stringify({ type: 'error', code: 'INVALID_JSON', message: 'Invalid JSON message' }));
    return;
  }

  if (message.type === 'host.create') {
    if (ws.sessionCode) {
      ws.send(JSON.stringify({ type: 'error', code: 'SESSION_EXISTS', message: 'Host session already exists' }));
      return;
    }

    const ttlMs = Math.max(60 * 1000, Math.min(MAX_TTL_MS, Number(message.ttlMs || DEFAULT_TTL_MS)));
    const code = makeCode();
    const now = Date.now();
    const session = {
      code,
      ws,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
      expiresAtMs: now + ttlMs,
      pending: new Map(),
      lastFireAt: 0,
      forwarded: 0,
    };
    sessions.set(code, session);
    ws.sessionCode = code;
    ws.send(JSON.stringify({
      type: 'host.ready',
      code,
      expiresAt: session.expiresAt,
      ttlMs,
    }));
    return;
  }

  if (message.type === 'fire.ack') {
    const code = ws.sessionCode;
    const session = code ? sessions.get(code) : null;
    const requestId = String(message.requestId || '');
    const pending = session?.pending.get(requestId);
    if (!pending) return;
    session.pending.delete(requestId);
    pending.resolve({
      ok: message.ok === true,
      code: typeof message.code === 'string' ? message.code : undefined,
      message: typeof message.message === 'string' ? message.message : undefined,
      host: message.host,
    });
    return;
  }

  if (message.type === 'pong') return;

  ws.send(JSON.stringify({ type: 'error', code: 'UNKNOWN_MESSAGE', message: 'Unknown host message type' }));
}

const server = http.createServer((req, res) => {
  handleHttp(req, res).catch((error) => {
    console.error('[relay] HTTP handler failed:', error);
    json(res, 500, makeError('INTERNAL_ERROR', 'Internal server error'));
  });
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (requestUrl.pathname !== '/ws/host') {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws) => {
  const createTimer = setTimeout(() => {
    if (!ws.sessionCode && ws.readyState === WebSocket.OPEN) {
      ws.close(1008, 'host.create timeout');
    }
  }, 10000);

  ws.on('message', (raw) => handleHostMessage(ws, raw));
  ws.on('close', () => {
    clearTimeout(createTimer);
    if (ws.sessionCode) {
      closeSession(ws.sessionCode, 'host disconnected');
    }
  });
  ws.on('error', (error) => {
    console.error('[relay] host websocket error:', error);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, session] of sessions) {
    if (now >= session.expiresAtMs) {
      closeSession(code, 'expired');
    } else if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.ping();
    }
  }
}, 30000).unref();

server.listen(PORT, HOST, () => {
  console.log(`[relay] listening on http://${HOST}:${PORT}`);
  console.log('[relay] host websocket path: /ws/host');
});
