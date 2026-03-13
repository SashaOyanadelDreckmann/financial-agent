import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const DATA_DIR = path.join(process.cwd(), 'data');

router.get('/diagnosis/latest', (_req, res) => {
  try {
    const files = fs
      .readdirSync(DATA_DIR)
      .filter((f) => f.startsWith('financial_profile_'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return res.status(404).json({ error: 'No diagnosis found' });
    }

    const latestPath = path.join(DATA_DIR, files[0]);
    const raw = fs.readFileSync(latestPath, 'utf-8');

    const parsed = JSON.parse(raw); // 👈 CLAVE

    return res.json(parsed); // 👈 SOLO UNA RESPUESTA
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Failed to load diagnosis',
    });
  }
});

export default router;
