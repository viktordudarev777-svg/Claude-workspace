import { Router } from 'express';
import { z } from 'zod';
import type { AnalysisService } from '../services/analysisService';
import { asyncHandler, HttpError } from '../middleware/errors';
import type { Config } from '../config';

const barcodeSchema = z.object({
  barcode: z.string().min(8).max(14).regex(/^\d+$/, 'barcode must contain digits only'),
});

const labelSchema = z.object({
  text: z.string().min(1).max(20_000),
  barcode: z.string().regex(/^\d{8,14}$/).optional(),
  ocrConfidence: z.number().min(0).max(1).optional(),
});

const photoSchema = z.object({
  imageBase64: z.string().min(100),
});

export function analyzeRoutes(service: AnalysisService, config: Config): Router {
  const router = Router();

  /** POST /api/v1/analyze/barcode — the most accurate path. */
  router.post(
    '/barcode',
    asyncHandler(async (req, res) => {
      const { barcode } = barcodeSchema.parse(req.body);
      res.json(await service.analyzeBarcode(barcode, req.locale, req.deviceId));
    }),
  );

  /** POST /api/v1/analyze/label — text recognised by the phone's own OCR. */
  router.post(
    '/label',
    asyncHandler(async (req, res) => {
      const body = labelSchema.parse(req.body);
      res.json(
        await service.analyzeLabelText(body.text, req.locale, req.deviceId, {
          ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
          ...(body.ocrConfidence !== undefined ? { ocrConfidence: body.ocrConfidence } : {}),
        }),
      );
    }),
  );

  /** POST /api/v1/analyze/photo — server-side OCR plus product recognition. */
  router.post(
    '/photo',
    asyncHandler(async (req, res) => {
      const { imageBase64 } = photoSchema.parse(req.body);
      // Base64 inflates by 4/3; compare against the decoded size.
      if ((imageBase64.length * 3) / 4 > config.maxImageBytes) {
        throw new HttpError(413, 'image_too_large', `Image exceeds ${config.maxImageBytes} bytes`);
      }
      res.json(await service.analyzePhoto(imageBase64, req.locale, req.deviceId));
    }),
  );

  return router;
}
