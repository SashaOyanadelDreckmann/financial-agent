// apps/api/src/services/storage.service.ts
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FinancialDiagnosticProfile } from '../schemas/profile.schema';
import { getLogger } from '../logger';

/* ────────────────────────────── */
/* Configuración base             */
/* ────────────────────────────── */

/**
 * Directorio base donde se persistirán los perfiles financieros.
 * Para MVP / tesis se utiliza filesystem local.
 *
 * En producción este servicio puede ser reemplazado
 * por una implementación sobre DB o storage externo.
 */
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), 'data');

/* ────────────────────────────── */
/* Utilidades internas            */
/* ────────────────────────────── */

/**
 * Asegura la existencia del directorio base.
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Genera un identificador trazable y ordenable temporalmente.
 */
function generateProfileId(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  // Incluye UUID para evitar colisiones y evitar IDs predecibles en producción.
  return `financial_profile_${ts}_${crypto.randomUUID()}`;
}

/**
 * Construye la ruta absoluta de un perfil a partir de su ID.
 */
function resolveProfilePath(profileId: string): string {
  return path.join(DATA_DIR, `${profileId}.json`);
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

/* ────────────────────────────── */
/* API pública del servicio       */
/* ────────────────────────────── */

/**
 * Persiste el perfil financiero final generado por el sistema.
 * Este es el OUTPUT canónico del Agente Diagnóstico.
 */
export function saveProfile(
  profile: FinancialDiagnosticProfile
): {
  profileId: string;
  filePath: string;
} {
  ensureDataDir();

  const profileId = generateProfileId();
  const filePath = resolveProfilePath(profileId);

  atomicWriteJson(filePath, profile);

  return {
    profileId,
    filePath,
  };
}

/**
 * Recupera un perfil financiero previamente persistido.
 * Retorna null si el perfil no existe.
 */
export function loadProfile(
  profileId: string
): FinancialDiagnosticProfile | null {
  const filePath = resolveProfilePath(profileId);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');

  try {
    return JSON.parse(raw) as FinancialDiagnosticProfile;
  } catch (err) {
    // Corrupción o formato inválido
    getLogger().error({
      msg: `[storage] Error parsing profile ${profileId}`,
      error: err,
    });
    return null;
  }
}

/**
 * Lista los IDs de perfiles almacenados.
 * Útil para testing, auditoría o herramientas administrativas.
 */
export function listProfiles(): string[] {
  ensureDataDir();

  return fs
    .readdirSync(DATA_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''));
}

/**
 * Elimina un perfil almacenado.
 * NO se usa en flujo normal, solo para testing o limpieza manual.
 */
export function deleteProfile(profileId: string): boolean {
  const filePath = resolveProfilePath(profileId);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  fs.unlinkSync(filePath);
  return true;
}
