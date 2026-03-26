import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

const BASE_DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

const SESSIONS_DIR = path.join(BASE_DATA_DIR, 'sessions');

function ensureSessionsDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function sessionPath(token: string) {
  return path.join(SESSIONS_DIR, `${token}.json`);
}

function nowMs() {
  return Date.now();
}

function parseMs(dateIso: string) {
  const ms = Date.parse(dateIso);
  return Number.isFinite(ms) ? ms : 0;
}

function atomicWriteJson(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${crypto
      .randomBytes(6)
      .toString('hex')}.tmp`
  );
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

export function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const ttlDays = Number(process.env.SESSION_TTL_DAYS ?? '7');
  const ttlMs = Number.isFinite(ttlDays) ? Math.max(1, ttlDays) * 86400_000 : 7 * 86400_000;

  return {
    httpOnly: true as const,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    secure: isProd,
    maxAge: ttlMs,
    path: '/',
  };
}

export function createSession(userId: string): SessionRecord {
  ensureSessionsDir();

  const ttlDays = Number(process.env.SESSION_TTL_DAYS ?? '7');
  const ttlMs = Number.isFinite(ttlDays) ? Math.max(1, ttlDays) * 86400_000 : 7 * 86400_000;

  const token = crypto.randomBytes(32).toString('base64url');
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(nowMs() + ttlMs).toISOString();

  const rec: SessionRecord = { token, userId, createdAt, expiresAt };
  atomicWriteJson(sessionPath(token), rec);
  return rec;
}

export function loadSession(token: string): SessionRecord | null {
  if (!token) return null;
  const p = sessionPath(token);
  if (!fs.existsSync(p)) return null;

  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(raw) as SessionRecord;

    if (!parsed?.userId || !parsed?.expiresAt) return null;

    const exp = parseMs(parsed.expiresAt);
    if (!exp || exp < nowMs()) {
      try {
        fs.unlinkSync(p);
      } catch {}
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function destroySession(token: string): boolean {
  if (!token) return false;
  const p = sessionPath(token);
  if (!fs.existsSync(p)) return false;
  try {
    fs.unlinkSync(p);
    return true;
  } catch {
    return false;
  }
}

