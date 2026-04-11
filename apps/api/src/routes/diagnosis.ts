import { Router } from 'express';
import { loadProfile } from '../services/storage.service';
import { loadSession } from '../services/session.service';
import { loadUserById } from '../services/user.service';

const router = Router();

router.get('/diagnosis/latest', (req, res) => {
  try {
    const token = req.cookies?.session;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = loadSession(token);
    if (!session?.userId) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const user = loadUserById(session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const latestProfileId = (user as any).latestDiagnosticProfileId;
    if (!latestProfileId) {
      return res.status(404).json({ error: 'No diagnosis found for this user' });
    }

    const profile = loadProfile(latestProfileId);
    if (!profile) {
      return res.status(404).json({ error: 'Stored diagnosis could not be loaded' });
    }

    return res.json(profile);
  } catch (err) {
    (req as any).logger?.error({ msg: 'Failed to load diagnosis', error: err });
    return res.status(500).json({
      error: 'Failed to load diagnosis',
    });
  }
});

export default router;
