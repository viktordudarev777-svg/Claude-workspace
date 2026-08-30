import express, { type Express } from 'express';
import type { Config } from './config';
import { openDatabase, type Db } from './db/client';
import { DeviceRepository, OffCacheRepository, ScanRepository } from './db/repositories';
import { OpenFoodFactsClient } from './integrations/openfoodfacts';
import { createOcrProvider } from './integrations/ocr';
import { createVisionProvider } from './integrations/vision';
import { AnalysisService } from './services/analysisService';
import { requestContext } from './middleware/context';
import { errorHandler } from './middleware/errors';
import { analyzeRoutes } from './routes/analyze';
import { additiveRoutes } from './routes/additives';
import { historyRoutes } from './routes/history';
import { bundleRoutes } from './routes/bundle';
import { getAdditiveDatabase, getWholeFoods } from '@foodlens/data';

export interface AppOverrides {
  db?: Db;
  off?: OpenFoodFactsClient;
  fetchImpl?: typeof fetch;
}

export interface BuiltApp {
  app: Express;
  db: Db;
  service: AnalysisService;
}

/**
 * Wires the application together.
 *
 * Dependencies are injectable so tests can run against an in-memory database
 * and a stubbed Open Food Facts client without touching the network.
 */
export function createApp(config: Config, overrides: AppOverrides = {}): BuiltApp {
  const db = overrides.db ?? openDatabase(config.databasePath);
  const devices = new DeviceRepository(db);
  const scans = new ScanRepository(db);
  const cache = new OffCacheRepository(db);

  const off =
    overrides.off ??
    new OpenFoodFactsClient({
      baseUrl: config.off.baseUrl,
      userAgent: config.off.userAgent,
      timeoutMs: config.off.timeoutMs,
      enabled: config.off.enabled,
      ...(overrides.fetchImpl ? { fetchImpl: overrides.fetchImpl } : {}),
    });

  // Fail fast: a malformed data file should stop the process at boot, not on
  // the first user request.
  const additives = getAdditiveDatabase();
  const wholeFoods = getWholeFoods();

  const service = new AnalysisService({
    off,
    additives,
    wholeFoods,
    ocr: createOcrProvider(config, overrides.fetchImpl ?? fetch),
    vision: createVisionProvider(config, overrides.fetchImpl ?? fetch),
    scans,
    cache,
  });

  const app = express();
  app.use(express.json({ limit: '12mb' }));
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.corsOrigin);
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id, Accept-Language');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    next();
  });
  app.options(/.*/, (_req, res) => res.sendStatus(204));
  app.use(requestContext(devices));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      additives: additives.all.length,
      dataVersion: additives.version,
      openFoodFacts: config.off.enabled ? 'enabled' : 'disabled',
      vision: config.vision.provider,
      ocr: config.ocr.provider,
    });
  });

  app.use('/api/v1/analyze', analyzeRoutes(service, config));
  app.use('/api/v1/additives', additiveRoutes());
  app.use('/api/v1/history', historyRoutes(scans));
  app.use('/api/v1/bundle', bundleRoutes());

  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Unknown endpoint' });
  });
  app.use(errorHandler);

  return { app, db, service };
}
