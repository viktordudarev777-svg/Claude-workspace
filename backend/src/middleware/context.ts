import type { NextFunction, Request, Response } from 'express';
import type { Locale } from '@foodlens/engine';
import { isLocale, localeFromHeader } from '@foodlens/engine';
import type { DeviceRepository } from '../db/repositories';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      locale: Locale;
      deviceId: string | null;
    }
  }
}

/**
 * Establishes request context.
 *
 * The app has no accounts: a device sends a random `X-Device-Id` it generated
 * on first launch, and that is the only identifier we store. No email, no
 * phone number, nothing that identifies a person.
 */
export function requestContext(devices: DeviceRepository) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const queryLocale = req.query.locale;
    req.locale = isLocale(queryLocale) ? queryLocale : localeFromHeader(req.header('accept-language'));

    const deviceId = req.header('x-device-id')?.trim() ?? '';
    // Reject anything that is not a plausible client-generated id so a caller
    // cannot use this header to write arbitrary keys into the database.
    req.deviceId = /^[A-Za-z0-9_-]{8,64}$/.test(deviceId) ? deviceId : null;
    if (req.deviceId) devices.touch(req.deviceId, req.locale);

    next();
  };
}

/** Routes that store or read per-device data require the header. */
export function requireDevice(req: Request, res: Response, next: NextFunction): void {
  if (!req.deviceId) {
    res.status(401).json({ error: 'missing_device_id', message: 'X-Device-Id header is required' });
    return;
  }
  next();
}
