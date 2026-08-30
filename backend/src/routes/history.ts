import { Router } from 'express';
import { z } from 'zod';
import type { ScanRepository } from '../db/repositories';
import { requireDevice } from '../middleware/context';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  favorites: z.coerce.boolean().default(false),
});

/** Per-device scan history. Everything here is scoped by `X-Device-Id`. */
export function historyRoutes(scans: ScanRepository): Router {
  const router = Router();
  router.use(requireDevice);

  router.get('/', (req, res) => {
    const { limit, offset, favorites } = listQuerySchema.parse(req.query);
    const items = scans.list(req.deviceId!, limit, offset, favorites);
    res.json({ items, limit, offset });
  });

  router.get('/stats', (req, res) => {
    res.json(scans.stats(req.deviceId!));
  });

  router.get('/:id', (req, res) => {
    const result = scans.get(req.deviceId!, req.params.id);
    if (!result) {
      res.status(404).json({ error: 'not_found', message: 'No such scan for this device' });
      return;
    }
    res.json(result);
  });

  router.post('/:id/favorite', (req, res) => {
    const favorite = z.object({ favorite: z.boolean() }).parse(req.body).favorite;
    if (!scans.setFavorite(req.deviceId!, req.params.id, favorite)) {
      res.status(404).json({ error: 'not_found', message: 'No such scan for this device' });
      return;
    }
    res.json({ id: req.params.id, favorite });
  });

  router.delete('/:id', (req, res) => {
    if (!scans.remove(req.deviceId!, req.params.id)) {
      res.status(404).json({ error: 'not_found', message: 'No such scan for this device' });
      return;
    }
    res.status(204).end();
  });

  return router;
}
