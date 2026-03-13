import fs from 'fs';
import path from 'path';
import type { SimulationArtifact } from './simulation.service';

function findRepoRoot(start: string) {
  let cur = start;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(cur, 'pnpm-workspace.yaml');
    if (fs.existsSync(candidate)) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return start;
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function indexPath() {
  const root = findRepoRoot(process.cwd());
  const dir = path.join(root, 'apps/web/public/pdfs/simulaciones');
  ensureDir(dir);
  return path.join(dir, 'index.json');
}

export function readIndex(): { artifacts: SimulationArtifact[] } {
  const p = indexPath();
  if (!fs.existsSync(p)) return { artifacts: [] };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { artifacts: [] };
  }
}

export function upsertArtifact(a: SimulationArtifact) {
  const idx = readIndex();
  const next = idx.artifacts.filter(x => x.id !== a.id);
  next.unshift(a);
  fs.writeFileSync(indexPath(), JSON.stringify({ artifacts: next }, null, 2));
}

export function markSaved(id: string, saved: boolean) {
  const idx = readIndex();
  const next = idx.artifacts.map(a => (a.id === id ? { ...a, saved } : a));
  fs.writeFileSync(indexPath(), JSON.stringify({ artifacts: next }, null, 2));
  return next.find(a => a.id === id);
}
