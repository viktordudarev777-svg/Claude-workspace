import { Router } from 'express';
import { getAdditiveDatabase } from '../domain/additives/database';
import { canonicalizeECode } from '../util/text';
import { normalize } from '../util/text';

/**
 * Read-only access to the additive dictionary, so the app can offer search and
 * a detail screen without shipping the data itself.
 */
export function additiveRoutes(): Router {
  const router = Router();

  /** GET /api/v1/additives?q=&risk=&category= */
  router.get('/', (req, res) => {
    const db = getAdditiveDatabase();
    const query = normalize(String(req.query.q ?? ''));
    const risk = req.query.risk ? String(req.query.risk) : null;
    const category = req.query.category ? String(req.query.category) : null;

    const items = db.all
      .filter((additive) => (risk ? additive.risk === risk : true))
      .filter((additive) => (category ? additive.category === category : true))
      .filter((additive) => {
        if (!query) return true;
        const haystack = [additive.code, additive.names.ru, additive.names.en, ...additive.synonyms]
          .map((value) => normalize(value))
          .join(' ');
        return haystack.includes(query);
      })
      .map((additive) => ({
        code: additive.code,
        name: additive.names[req.locale],
        category: additive.category,
        risk: additive.risk,
        summary: additive.summary[req.locale],
      }));

    res.json({ total: items.length, items });
  });

  /** GET /api/v1/additives/:code — full entry with sources. */
  router.get('/:code', (req, res) => {
    const db = getAdditiveDatabase();
    const code = canonicalizeECode(req.params.code) ?? req.params.code.toUpperCase();
    const additive = db.byCode.get(code);

    if (!additive) {
      res.status(404).json({ error: 'not_found', message: `Additive ${code} is not in the database` });
      return;
    }

    res.json({
      code: additive.code,
      name: additive.names[req.locale],
      category: additive.category,
      risk: additive.risk,
      summary: additive.summary[req.locale],
      detail: additive.detail[req.locale],
      concerns: additive.concerns,
      origin: additive.origin,
      adiMgPerKgBw: additive.adiMgPerKgBw,
      restrictedIn: additive.restrictedIn,
      synonyms: additive.synonyms,
      sources: additive.sources.map((key) => db.references[key]).filter(Boolean),
    });
  });

  return router;
}
