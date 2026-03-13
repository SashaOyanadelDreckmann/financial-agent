// apps/api/src/services/storage.service.ts
import fs from 'fs';
import path from 'path';
import { FinancialDiagnosticProfile } from '../schemas/profile.schema';

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
const DATA_DIR = path.join(process.cwd(), 'data');

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
 * NOTA: deliberadamente no usa UUID para facilitar auditoría humana.
 */
function generateProfileId(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `financial_profile_${ts}`;
}

/**
 * Construye la ruta absoluta de un perfil a partir de su ID.
 */
function resolveProfilePath(profileId: string): string {
  return path.join(DATA_DIR, `${profileId}.json`);
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

  fs.writeFileSync(
    filePath,
    JSON.stringify(profile, null, 2),
    'utf-8'
  );

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
    console.error(
      `[storage] Error parsing profile ${profileId}:`,
      err
    );
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
