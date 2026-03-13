import { Router } from 'express';
import { readIndex, markSaved } from '../services/simulations/simulation.library';

export const simulationsRouter = Router();

simulationsRouter.get('/', (_req, res) => {
  const idx = readIndex();
  res.json(idx);
});

simulationsRouter.post('/:id/save', (req, res) => {
  const { id } = req.params;
  const saved = Boolean(req.body?.saved ?? true);
  const updated = markSaved(id, saved);
  res.json({ ok: true, artifact: updated });
});
