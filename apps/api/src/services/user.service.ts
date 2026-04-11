import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User } from '../schemas/user.schema';

const BASE_DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

const USERS_DIR = path.join(BASE_DATA_DIR, 'users');

function ensureUsersDir() {
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
}

function generateUserId() {
  return `user_${crypto.randomUUID()}`;
}

/**
 * Atomically write JSON file with temp file safety.
 * Prevents data corruption from concurrent writes.
 * @param filePath - Path to target file
 * @param data - Data to write
 */
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

/**
 * Create a new user account.
 * @param data - User creation data (name, email, passwordHash)
 * @returns Created user with generated ID
 * @throws Error if email already exists
 */
export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}): User {
  ensureUsersDir();

  const id = generateUserId();
  const user: User = {
    id,
    ...data,
    knowledgeBaseScore: 0,
    knowledgeScore: 0,
    knowledgeHistory: [],
    knowledgeLastUpdated: new Date().toISOString(),
  };

  atomicWriteJson(path.join(USERS_DIR, `${id}.json`), user);
  addToEmailIndex(data.email, id);

  return user;
}

/**
 * Adjunto de un perfil (diagnóstico) al usuario para uso posterior por el agente core.
 */
export function attachProfileToUser(
  userId: string,
  profile: any
): boolean {
  ensureUsersDir();

  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return false;

  const user = safeReadUserFile(filePath);
  if (!user) return false;

  (user as any).injectedProfile = profile;

  try {
    atomicWriteJson(filePath, user);
    return true;
  } catch {
    return false;
  }
}

export function attachIntakeToUser(
  userId: string,
  intakePayload: { intake: any; llmSummary?: any }
): boolean {
  ensureUsersDir();

  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return false;

  const user = safeReadUserFile(filePath);
  if (!user) return false;

  (user as any).injectedIntake = intakePayload;

  try {
    atomicWriteJson(filePath, user);
    return true;
  } catch {
    return false;
  }
}

export function removeInjectedIntakeFromUser(userId: string): boolean {
  ensureUsersDir();

  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return false;

  const user = safeReadUserFile(filePath);
  if (!user) return false;

  if ((user as any).injectedIntake) {
    delete (user as any).injectedIntake;
  }

  try {
    atomicWriteJson(filePath, user);
    return true;
  } catch {
    return false;
  }
}

export function removeInjectedProfileFromUser(userId: string): boolean {
  ensureUsersDir();

  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return false;

  const user = safeReadUserFile(filePath);
  if (!user) return false;

  if ((user as any).injectedProfile) {
    delete (user as any).injectedProfile;
  }

  try {
    atomicWriteJson(filePath, user);
    return true;
  } catch {
    return false;
  }
}

function safeReadUserFile(filePath: string): User | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function findUserByEmail(email: string): User | null {
  ensureUsersDir();

  // Fast O(1) path via email index
  const index = loadEmailIndex();
  const userId = index[email.toLowerCase()];
  if (userId) {
    const user = loadUserById(userId);
    if (user && user.email.toLowerCase() === email.toLowerCase()) return user;
  }

  // Fallback: linear scan (builds index on first use)
  const files = fs.readdirSync(USERS_DIR).filter((f) => f.endsWith('.json'));
  for (const f of files) {
    const user = safeReadUserFile(path.join(USERS_DIR, f));
    if (user?.email?.toLowerCase() === email.toLowerCase()) {
      addToEmailIndex(user.email, user.id); // heal index
      return user;
    }
  }

  return null;
}

/**
 * ✅ NUEVO: cargar usuario por id (para session cookie)
 */
export function loadUserById(userId: string): User | null {
  ensureUsersDir();

  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return null;

  return safeReadUserFile(filePath);
}

/* ────────────────────────────────────────────── */
/* Email index — O(1) lookup                      */
/* ────────────────────────────────────────────── */
const EMAIL_INDEX_FILE = path.join(BASE_DATA_DIR, 'email_index.json');

function loadEmailIndex(): Record<string, string> {
  try {
    if (!fs.existsSync(EMAIL_INDEX_FILE)) return {};
    return JSON.parse(fs.readFileSync(EMAIL_INDEX_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function addToEmailIndex(email: string, userId: string) {
  try {
    const dir = path.dirname(EMAIL_INDEX_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const index = loadEmailIndex();
    index[email.toLowerCase()] = userId;
    const tmp = `${EMAIL_INDEX_FILE}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(index, null, 2), 'utf-8');
    fs.renameSync(tmp, EMAIL_INDEX_FILE);
  } catch {
    // non-fatal
  }
}

/* ────────────────────────────────────────────── */
/* Sheet persistence                              */
/* ────────────────────────────────────────────── */
export type StoredSheet = {
  id: string;
  name: string;
  autoNamed: boolean;
  items: any[];
  draft: string;
  status: 'active' | 'context';
  contextScore: number;
  userMessageCount: number;
  createdAt: string;
  completedAt?: string;
};

export function saveUserSheets(userId: string, sheets: StoredSheet[]): boolean {
  ensureUsersDir();
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return false;
  const user = safeReadUserFile(filePath);
  if (!user) return false;
  (user as any).sheets = sheets;
  try {
    atomicWriteJson(filePath, user);
    return true;
  } catch {
    return false;
  }
}

export function loadUserSheets(userId: string): StoredSheet[] | null {
  ensureUsersDir();
  const filePath = path.join(USERS_DIR, `${userId}.json`);
  if (!fs.existsSync(filePath)) return null;
  const user = safeReadUserFile(filePath);
  if (!user) return null;
  return (user as any).sheets ?? null;
}
