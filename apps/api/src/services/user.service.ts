import fs from 'fs';
import path from 'path';
import { User } from '../schemas/user.schema';

const USERS_DIR = path.join(process.cwd(), 'data', 'users');

function ensureUsersDir() {
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
}

function generateUserId() {
  return `user_${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
}): User {
  ensureUsersDir();

  const id = generateUserId();
  const user: User = { id, ...data };

  fs.writeFileSync(
    path.join(USERS_DIR, `${id}.json`),
    JSON.stringify(user, null, 2),
    'utf-8'
  );

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
    fs.writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf-8');
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
    fs.writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf-8');
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
    fs.writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf-8');
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
    fs.writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf-8');
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

  const files = fs.readdirSync(USERS_DIR);
  for (const f of files) {
    const user = safeReadUserFile(path.join(USERS_DIR, f));
    if (user?.email === email) return user;
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
