# @foodlens/engine

Движок анализа состава: на вход — текст этикетки и пищевая ценность, на выход —
светофор, оценка, находки и рекомендации.

## Главное свойство

Пакет **чистый**: ни сети, ни файловой системы, ни Node API. В `tsconfig.json`
стоит `"types": []`, поэтому это гарантирует компилятор, а не договорённость —
попытка позвать `fs` или `process` просто не соберётся.

Из этого следует то, ради чего пакет и выделен: на телефоне работает буквально
тот же код, что на сервере, и офлайн-вердикт совпадает с серверным, а не
приближает его.

## Использование

Данные передаются снаружи — сервер читает их с диска через `@foodlens/data`,
приложение строит из встроенного снимка:

```ts
import { analyzeProduct, buildAdditiveDatabase } from '@foodlens/engine';

const additives = buildAdditiveDatabase(groups, references, version);

const { result, breakdown } = analyzeProduct({
  source: 'label-ocr',
  locale: 'ru',
  additives,
  product: { ingredientsText: 'Состав: вода, сахар, консервант E211', /* ... */ },
  nutriments: { sugars: 11, energyKcal: 42 },
});

result.verdict;   // { light: 'yellow', score: 62, headline: 'Есть вопросы', summary: '…' }
breakdown;        // почему именно 62: по строке на каждую находку
```

## Что внутри

| Модуль | Отвечает за |
|---|---|
| `additives/matcher` | поиск добавок в тексте: коды, синонимы, починка OCR |
| `ingredients/parse` | разбор состава: вложенность, проценты, порядок |
| `nutrition/parseLabel` | чтение таблицы БЖУ с этикетки (ru/en/de) |
| `nutrition/thresholds` | светофоры UK FSA |
| `scoring/nutriScore` | Nutri-Score 2022/2023 |
| `scoring/flags` | трансжиры, пальмовое масло, сахар в начале состава и прочее |
| `scoring/score` | итоговые 0–100 и светофор, с разбивкой |
| `recommend/rules` | «что делать вместо» |
| `analyze` | всё вместе |

Тексты локализуются внутри движка (`i18n.ts`), поэтому клиент получает готовые
строки и не носит справочник сам.

## Тесты

```bash
npm test --workspace @foodlens/engine
```

66 тестов на фикстурах: ни один не ходит в сеть. Данные для тестов берутся из
`@foodlens/data` — это единственная зависимость, и только dev.
