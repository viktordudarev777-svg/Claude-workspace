import path from 'node:path';
import dotenv from 'dotenv';
import { dataDir, packageRoot } from './util/paths';

dotenv.config();

function str(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function int(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

export const config = {
  env: str('NODE_ENV', 'development'),
  port: int('PORT', 4000),
  corsOrigin: str('CORS_ORIGIN', '*'),
  dataDir: dataDir(),
  databasePath: str('DATABASE_PATH', path.join(packageRoot(), 'data/foodlens.db')),
  off: {
    baseUrl: str('OFF_BASE_URL', 'https://world.openfoodfacts.org'),
    userAgent: str('OFF_USER_AGENT', 'FoodLens/1.0 (contact@example.com)'),
    timeoutMs: int('OFF_TIMEOUT_MS', 6000),
    enabled: bool('OFF_ENABLED', true),
  },
  vision: {
    provider: str('VISION_PROVIDER', 'none') as 'none' | 'google-vision' | 'clarifai',
    googleApiKey: str('GOOGLE_VISION_API_KEY', ''),
    clarifaiPat: str('CLARIFAI_PAT', ''),
    clarifaiModel: str('CLARIFAI_MODEL', 'food-item-recognition'),
  },
  ocr: {
    provider: str('OCR_PROVIDER', 'none') as 'none' | 'google-vision',
  },
  /** Maximum size of an uploaded photo, base64-encoded. */
  maxImageBytes: int('MAX_IMAGE_BYTES', 8 * 1024 * 1024),
} as const;

export type Config = typeof config;
