# FoodLens API

База: `http://localhost:4000` · версия префикса: `/api/v1`

## Общие правила

**Язык.** `?locale=ru|en` или заголовок `Accept-Language`. По умолчанию `ru`.
Все пользовательские тексты (вердикт, объяснения, советы, предупреждения) приходят
уже переведёнными.

**Устройство.** Заголовок `X-Device-Id` — случайная строка `[A-Za-z0-9_-]{8,64}`,
которую клиент генерирует при первом запуске. Для `/analyze/*` он необязателен
(без него результат просто не попадёт в историю), для `/history/*` — обязателен.

**Ошибки.** Всегда JSON:

```json
{ "error": "invalid_barcode", "message": "\"3017620422004\" is not a valid EAN/UPC barcode" }
```

| Код | Когда |
|---|---|
| `invalid_request` (400) | тело не прошло валидацию, есть массив `details` с полями |
| `invalid_barcode` (400) | не сошлась контрольная цифра EAN/UPC |
| `image_too_large` (413) | снимок больше `MAX_IMAGE_BYTES` |
| `missing_device_id` (401) | нет `X-Device-Id` на защищённом маршруте |
| `not_found` (404) | нет такой добавки или скана у этого устройства |

---

## POST /api/v1/analyze/barcode

Самый точный путь: OCR не участвует.

```json
{ "barcode": "3017620422003" }
```

Контрольная цифра проверяется до обращения к сети, поэтому ошибка распознавания
камеры отсекается сразу. Ответ — `AnalysisResult` (ниже). Если продукта нет в
Open Food Facts, ответ всё равно `200`: вердикт строится по тому, что есть, а в
`warnings` объясняется, чего не хватило.

## POST /api/v1/analyze/label

Текст, распознанный на устройстве.

```json
{
  "text": "Состав: вода, сахар, консервант Е211 ... Пищевая ценность на 100 мл: ...",
  "barcode": "4600000000008",
  "ocrConfidence": 0.9
}
```

- `text` — **сырой** вывод OCR. Нормализация живёт на сервере, чтобы её улучшения
  приезжали без обновления приложения.
- `barcode` (необязательно) — если он тоже попал в кадр, из базы подтянутся название,
  бренд и картинка; состав при этом берётся с фотографии — это то, что физически
  в руках у покупателя.
- `ocrConfidence` (необязательно, 0..1) — ниже 0.6 добавляет предупреждение и
  снижает итоговую уверенность.

## POST /api/v1/analyze/photo

Снимок целиком, если у клиента нет своего OCR.

```json
{ "imageBase64": "/9j/4AAQSkZJRgABAQ..." }
```

Порядок разбора: сначала серверный OCR (читаемый состав важнее любых догадок о том,
что на фото), затем распознавание объекта, затем база цельных продуктов —
яблоко, гречка, пицца и так далее. Если не вышло ничего, приходит честный ответ с
низкой уверенностью и предупреждением, а не выдуманный вердикт.

---

## GET /api/v1/additives

`?q=` — код, название или синоним · `?risk=none|low|moderate|high` · `?category=`

```json
{
  "total": 1,
  "items": [
    { "code": "E621", "name": "Глутамат натрия", "category": "flavour-enhancer",
      "risk": "moderate", "summary": "Усилитель вкуса. Не яд, но признак того, что вкус нужно «чинить»." }
  ]
}
```

## GET /api/v1/additives/:code

Принимает `E621`, `e621`, `Е621` (кириллическая Е), `E-621`. Полная запись с
`detail`, `adiMgPerKgBw`, `restrictedIn`, `synonyms` и разрешёнными `sources`
(`{ title, url }`).

---

## История

Всё под `X-Device-Id`; чужие записи не видны.

| Метод | Путь | Что делает |
|---|---|---|
| `GET` | `/api/v1/history?limit=&offset=&favorites=` | список `HistoryEntry` |
| `GET` | `/api/v1/history/stats` | `{ total, green, yellow, red, averageScore }` |
| `GET` | `/api/v1/history/:id` | полный `AnalysisResult` |
| `POST` | `/api/v1/history/:id/favorite` | тело `{ "favorite": true }` |
| `DELETE` | `/api/v1/history/:id` | `204` |

## Справочные данные для офлайна

| Метод | Путь | Что делает |
|---|---|---|
| `GET` | `/api/v1/bundle/version` | `{ version, sizeBytes }` — дешёвая проверка перед загрузкой |
| `GET` | `/api/v1/bundle` | весь справочник: `{ version, references, groups, wholeFoods }` |

Приложение носит снимок этих данных внутри себя, поэтому работает сразу после
установки, а с сети подтягивает обновление, только если версия отличается.
Ответ отдаётся с `ETag`, так что клиент с актуальной версией получает `304` и
ничего не качает.

`version` выводится из содержимого файлов, а не из версии приложения: он меняется
при любой правке данных.

## GET /health

```json
{ "status": "ok", "version": "1.0.0", "additives": 204,
  "dataVersion": "2026-08-30-304558",
  "openFoodFacts": "enabled", "vision": "none", "ocr": "none" }
```

---

## AnalysisResult

```jsonc
{
  "id": "0f6c…",                     // и идентификатор записи в истории
  "source": "barcode",               // barcode | label-ocr | photo
  "scannedAt": "2026-08-30T13:00:00.000Z",
  "locale": "ru",

  "product": {
    "barcode": "3017620422003",
    "name": "…", "brand": "…", "quantity": "400 g",
    "categories": ["chocolate spreads"],
    "imageUrl": "https://…",
    "ingredientsText": "Сахар, пальмовое масло, …",
    "ingredients": [                 // порядок = убывание массы по закону
      { "raw": "фундук 13%", "normalized": "фундук", "percent": 13, "children": [], "rank": 2 }
    ],
    "dataSource": "openfoodfacts"    // openfoodfacts | label | vision | unknown
  },

  "verdict": {
    "light": "red",                  // green | yellow | red
    "score": 24,                     // 0-100, больше — лучше
    "headline": "Лучше не брать",
    "summary": "…"
  },

  "nutriScore": {
    "grade": "E", "points": 31, "negativePoints": 31, "positivePoints": 0,
    "profile": "general",            // general | beverage | cheese | water | fat-oil-nut-seed
    "estimated": false,              // true — считали по неполным данным
    "breakdown": [{ "component": "sugars", "value": 56.3, "points": 15 }]
  },

  "nutriments": { "energyKcal": 539, "sugars": 56.3, "salt": 0.107 },

  "nutrientLights": [                // критерии UK FSA, на 100 г
    { "nutrient": "sugars", "valuePer100g": 56.3, "light": "red",
      "label": "Сахар", "explanation": "Сахар: 56.3 г на 100 г — много, порог «красного» 22.5 г." }
  ],

  "additives": [
    { "code": "E250", "name": "Нитрит натрия", "category": "preservative", "risk": "high",
      "summary": "…", "detail": "…",
      "concerns": ["nitrosamine-forming", "carcinogen-classified"],
      "restrictedIn": [],
      "matchedText": "Е250",         // как это выглядело на этикетке
      "confidence": 0.99 }           // ниже 0.9 — совпадение по нечёткому тексту
  ],

  "flags": [
    { "id": "high-sugar", "severity": "warning", "title": "…", "explanation": "…", "concerns": ["excess-sugar"] }
  ],

  "recommendations": [
    { "id": "less-sugar", "text": "Возьмите вариант без добавленного сахара…",
      "rationale": "Здесь 56.3 г сахара на 100 г.", "priority": 2 }
  ],

  "alternatives": [                  // та же категория, пересчитано нашим движком
    { "barcode": "…", "name": "…", "brand": "…", "imageUrl": "…",
      "score": 71, "light": "yellow", "reason": "Оценка 71 из 100 — лучше, чем у отсканированного." }
  ],

  "confidence": { "overall": 0.85, "notes": [] },
  "warnings": ["Продукта нет в базе Open Food Facts. …"]
}
```

`warnings` и `confidence` — не косметика: по ним видно, чему в ответе можно верить.
Приложение показывает их отдельным блоком, а не прячет.
