import { Router } from 'express';
import { loadRawData } from '@foodlens/data';

/**
 * Serves the reference data the mobile app needs to analyse a label offline.
 *
 * The app ships a snapshot so it works on first launch with no connection, and
 * refreshes from here when the version differs. That is the whole offline
 * story: the engine is already pure, so once the app has this data it produces
 * exactly the same verdict the server would, not an approximation.
 */
export function bundleRoutes(): Router {
  const router = Router();

  // Loaded once: the files never change while the process is running.
  const data = loadRawData();
  const payload = JSON.stringify({
    version: data.version,
    references: data.references,
    groups: data.groups,
    wholeFoods: data.wholeFoods,
  });

  /** GET /api/v1/bundle/version — cheap check before downloading ~600 KB. */
  router.get('/version', (_req, res) => {
    res.json({ version: data.version, sizeBytes: Buffer.byteLength(payload) });
  });

  /**
   * GET /api/v1/bundle — the full data set.
   *
   * ETag lets a client that already has the current version skip the download
   * entirely; Express answers the conditional request with a 304.
   */
  router.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('ETag', `"${data.version}"`);
    res.send(payload);
  });

  return router;
}
