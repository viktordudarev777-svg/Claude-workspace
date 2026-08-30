import type { Locale } from './types';

type Params = Record<string, string | number>;

/**
 * Russian needs three plural forms. Used for counts that appear inside
 * user-facing sentences, where "3 маркеров" reads as broken text.
 */
export function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = count % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/**
 * Message catalogue. The API localises everything server-side, so the mobile
 * client stays a thin renderer and new languages ship without an app update.
 *
 * Keys are grouped by the module that uses them.
 */
const MESSAGES = {
  ru: {
    'nutrient.fat': 'Жиры',
    'nutrient.saturatedFat': 'Насыщенные жиры',
    'nutrient.sugars': 'Сахар',
    'nutrient.salt': 'Соль',
    'nutrient.low': ({ name, value, unit }: Params) => `${name}: ${value} ${unit} на 100 г — мало, это хорошо.`,
    'nutrient.medium': ({ name, value, unit }: Params) => `${name}: ${value} ${unit} на 100 г — средний уровень.`,
    'nutrient.high': ({ name, value, unit, limit }: Params) =>
      `${name}: ${value} ${unit} на 100 г — много, порог «красного» ${limit} ${unit}.`,

    'verdict.green': 'Хороший состав',
    'verdict.yellow': 'Есть вопросы',
    'verdict.red': 'Лучше не брать',
    'verdict.summary.green': 'Ничего тревожного в составе не нашлось.',
    'verdict.summary.yellow': 'Продукт съедобный, но есть к чему придраться — детали ниже.',
    'verdict.summary.red': 'Нашлись серьёзные претензии к составу или к пищевой ценности.',
    'verdict.summary.additives': ({ count }: Params) => `Добавок с вопросами: ${count}.`,
    'verdict.summary.noData': 'Данных мало, оценка ориентировочная.',

    'flag.transFat.title': 'Трансжиры',
    'flag.transFat.text':
      'В составе есть частично гидрогенизированные жиры — источник промышленных трансжиров. ВОЗ рекомендует исключить их полностью: они повышают «плохой» холестерин и снижают «хороший».',
    'flag.transFatValue.title': ({ value }: Params) => `Трансжиры: ${value} г на 100 г`,
    'flag.transFatValue.text':
      'ВОЗ рекомендует не более 1% калорий из трансжиров — это около 2 г в день для взрослого.',
    'flag.sugar.title': ({ value }: Params) => `Много сахара: ${value} г на 100 г`,
    'flag.sugar.text':
      'ВОЗ советует держать добавленный сахар ниже 10% калорий, а лучше ниже 5% — это примерно 25 г в день для взрослого.',
    'flag.sugarFirst.title': 'Сахар — в начале списка',
    'flag.sugarFirst.text':
      'Ингредиенты перечисляют по убыванию массы. Сахар в первой тройке означает, что его в продукте больше, чем большинства остальных компонентов.',
    'flag.salt.title': ({ value }: Params) => `Много соли: ${value} г на 100 г`,
    'flag.salt.text':
      'ВОЗ рекомендует не более 5 г соли в день. Одна порция такого продукта может занять заметную часть этой нормы.',
    'flag.satFat.title': ({ value }: Params) => `Много насыщенных жиров: ${value} г на 100 г`,
    'flag.satFat.text': 'Насыщенные жиры влияют на уровень холестерина; их долю в рационе стоит ограничивать.',
    'flag.palmOil.title': 'Пальмовое масло',
    'flag.palmOil.text':
      'Само по себе не яд, но это дешёвый источник насыщенных жиров, а при промышленной очистке в нём могут образовываться глицидиловые эфиры. Признак экономии на сырье.',
    'flag.sweeteners.title': 'Подсластители вместо сахара',
    'flag.sweeteners.text':
      'Калорий меньше, но вкус остаётся очень сладким — привычка к сладкому никуда не уходит. Часть подсластителей вызывает вздутие.',
    'flag.gmo.title': 'Отметка о ГМО',
    'flag.gmo.text':
      'На упаковке есть указание на ГМО-компоненты. С точки зрения безопасности одобренные ГМО-культуры признаны сопоставимыми с обычными; это вопрос личного выбора и маркировки, а не доказанного вреда.',
    'flag.ultraProcessed.title': ({ count }: Params) =>
      `Признаки ультрапереработки: ${count} ${pluralRu(Number(count), 'маркер', 'маркера', 'маркеров')}`,
    'flag.ultraProcessed.text':
      'Эмульгаторы, модифицированные крахмалы, усилители вкуса и красители вместе означают, что перед вами промышленная рецептура, а не еда из нескольких понятных ингредиентов.',
    'flag.allergen.title': ({ list }: Params) => `Возможные аллергены: ${list}`,
    'flag.allergen.text': 'Эти компоненты чаще других вызывают реакции. Если у вас есть аллергия — читайте состав целиком.',
    'flag.additiveHigh.title': ({ list }: Params) => `Добавки высокого риска: ${list}`,
    'flag.additiveHigh.text': 'Эти вещества либо где-то запрещены, либо имеют серьёзные вопросы по безопасности.',
    'flag.short.title': 'Короткий и понятный состав',
    'flag.short.text': 'Мало ингредиентов и все они узнаваемы — обычно это хороший признак.',
    'flag.fiber.title': ({ value }: Params) => `Много клетчатки: ${value} г на 100 г`,
    'flag.fiber.text': 'Клетчатка полезна для кишечника и помогает дольше оставаться сытым.',
    'flag.protein.title': ({ value }: Params) => `Много белка: ${value} г на 100 г`,
    'flag.protein.text': 'Белок хорошо насыщает и нужен для мышц.',

    'rec.avoidAdditive': ({ name, code }: Params) => `Поищите аналог без «${name}» (${code}).`,
    'rec.avoidAdditiveWhy': ({ reason }: Params) => reason,
    'rec.lessSugar': 'Возьмите вариант без добавленного сахара — например, натуральный йогурт или продукт с пометкой «без сахара», и добавьте сладость фруктами.',
    'rec.lessSugarWhy': ({ value }: Params) => `Здесь ${value} г сахара на 100 г.`,
    'rec.lessSalt': 'Посмотрите версию с пониженным содержанием соли или готовьте из необработанных продуктов.',
    'rec.lessSaltWhy': ({ value }: Params) => `Здесь ${value} г соли на 100 г при норме 5 г в день.`,
    'rec.avoidTransFat': 'Замените на продукт на растительном масле без гидрогенизации или на сливочном масле.',
    'rec.avoidTransFatWhy': 'Промышленные трансжиры ВОЗ рекомендует исключить полностью.',
    'rec.avoidNitrite': 'Если едите колбасные изделия — берите их реже и ищите варианты без нитритов, а для бутербродов используйте запечённое мясо.',
    'rec.avoidNitriteWhy': 'Обработанное мясо отнесено IARC к группе 1 — доказанным канцерогенам.',
    'rec.preferShortList': 'Выбирайте продукт с более коротким составом: чем меньше строк, тем меньше промышленной обработки.',
    'rec.preferShortListWhy': ({ count }: Params) => `Здесь ${count} ингредиентов.`,
    'rec.preferTocopherol': 'Ищите вариант, где антиоксидант — токоферолы (E306, витамин E), а не BHA/BHT.',
    'rec.preferTocopherolWhy': 'Тот же эффект, но без вопросов к безопасности.',
    'rec.checkAllergen': ({ list }: Params) => `Проверьте переносимость: ${list}.`,
    'rec.checkAllergenWhy': 'Эти компоненты чаще всего вызывают реакции у чувствительных людей.',
    'rec.childCaution': 'Для детского рациона поищите вариант без синтетических красителей.',
    'rec.childCautionWhy': 'В ЕС такие красители обязаны нести предупреждение о влиянии на активность и внимание детей.',
    'rec.childCautionOther': ({ list }: Params) => `Для детского рациона поищите вариант без ${list}.`,
    'rec.childCautionOtherWhy':
      'Эти добавки изучались в связи с активностью и вниманием у детей — для взрослых вопрос куда менее острый.',
    'rec.phenylketonuria': 'Продукт содержит источник фенилаланина — он противопоказан при фенилкетонурии.',
    'rec.phenylketonuriaWhy': 'Это единственное строгое противопоказание к аспартаму.',
    'rec.laxative': 'Не съедайте много за раз: сахарные спирты в количестве дают вздутие и послабление.',
    'rec.laxativeWhy': 'Порог у большинства людей — около 20-30 г за приём.',
    'rec.goodChoice': 'Хороший выбор — можно брать.',
    'rec.goodChoiceWhy': 'Ни серьёзных добавок, ни перебора по сахару, соли и жирам не нашлось.',

    'warning.noIngredients': 'Состав не распознан. Попробуйте сфотографировать этикетку крупнее или отсканировать штрихкод.',
    'warning.notInDatabase': 'Продукта нет в базе Open Food Facts. Сфотографируйте состав — разберём по этикетке.',
    'warning.unknownCodes': ({ list }: Params) => `Не удалось распознать коды: ${list}. Возможно, ошибка распознавания.`,
    'warning.offOffline': 'Сервис базы продуктов недоступен, работаем только по фотографии.',
    'warning.lowOcrConfidence': 'Текст распознан не полностью — часть состава могла потеряться.',
    'warning.noNutrition': 'Пищевая ценность не указана или не распозналась.',
    'warning.offline': 'Разбор сделан на телефоне без интернета: база продуктов и подбор замены недоступны.',
    'warning.offlineStale': ({ date }: Params) => `Справочник добавок обновлялся ${date} — подключитесь к сети, чтобы обновить.`,

    'alt.reason.betterScore': ({ score }: Params) => `Оценка ${score} из 100 — лучше, чем у отсканированного.`,
  },
  en: {
    'nutrient.fat': 'Fat',
    'nutrient.saturatedFat': 'Saturated fat',
    'nutrient.sugars': 'Sugar',
    'nutrient.salt': 'Salt',
    'nutrient.low': ({ name, value, unit }: Params) => `${name}: ${value} ${unit} per 100 g — low, which is good.`,
    'nutrient.medium': ({ name, value, unit }: Params) => `${name}: ${value} ${unit} per 100 g — medium.`,
    'nutrient.high': ({ name, value, unit, limit }: Params) =>
      `${name}: ${value} ${unit} per 100 g — high; the red threshold is ${limit} ${unit}.`,

    'verdict.green': 'Good composition',
    'verdict.yellow': 'Some concerns',
    'verdict.red': 'Better to skip',
    'verdict.summary.green': 'Nothing worrying was found in the composition.',
    'verdict.summary.yellow': 'Edible, but there are things to note — details below.',
    'verdict.summary.red': 'There are serious concerns in the composition or the nutrition.',
    'verdict.summary.additives': ({ count }: Params) => `Additives with concerns: ${count}.`,
    'verdict.summary.noData': 'Little data available, so this is a rough estimate.',

    'flag.transFat.title': 'Trans fats',
    'flag.transFat.text':
      'The list contains partially hydrogenated fats, a source of industrial trans fats. The WHO recommends eliminating them entirely: they raise LDL and lower HDL cholesterol.',
    'flag.transFatValue.title': ({ value }: Params) => `Trans fats: ${value} g per 100 g`,
    'flag.transFatValue.text': 'The WHO advises under 1% of calories from trans fats — about 2 g a day for an adult.',
    'flag.sugar.title': ({ value }: Params) => `High in sugar: ${value} g per 100 g`,
    'flag.sugar.text':
      'The WHO advises keeping added sugar below 10% of calories, ideally below 5% — roughly 25 g a day for an adult.',
    'flag.sugarFirst.title': 'Sugar near the top of the list',
    'flag.sugarFirst.text':
      'Ingredients are listed by descending weight. Sugar in the first three means there is more of it than of most other components.',
    'flag.salt.title': ({ value }: Params) => `High in salt: ${value} g per 100 g`,
    'flag.salt.text':
      'The WHO recommends no more than 5 g of salt a day. One portion of this can take a noticeable share of that.',
    'flag.satFat.title': ({ value }: Params) => `High in saturated fat: ${value} g per 100 g`,
    'flag.satFat.text': 'Saturated fat affects cholesterol levels and its share of the diet is worth limiting.',
    'flag.palmOil.title': 'Palm oil',
    'flag.palmOil.text':
      'Not a poison in itself, but a cheap source of saturated fat, and industrial refining can form glycidyl esters. A sign of cost-cutting on raw materials.',
    'flag.sweeteners.title': 'Sweeteners instead of sugar',
    'flag.sweeteners.text':
      'Fewer calories, but the taste stays very sweet, so the sweet-tooth habit remains. Some sweeteners cause bloating.',
    'flag.gmo.title': 'GMO declaration',
    'flag.gmo.text':
      'The pack declares GM components. Safety-wise, approved GM crops are considered comparable to conventional ones; this is a matter of personal choice and labelling, not of proven harm.',
    'flag.ultraProcessed.title': ({ count }: Params) => `Ultra-processing markers: ${count}`,
    'flag.ultraProcessed.text':
      'Emulsifiers, modified starches, flavour enhancers and colours together mean an industrial formulation rather than food made of a few recognisable ingredients.',
    'flag.allergen.title': ({ list }: Params) => `Possible allergens: ${list}`,
    'flag.allergen.text': 'These components trigger reactions more often than others. If you have an allergy, read the full list.',
    'flag.additiveHigh.title': ({ list }: Params) => `High-risk additives: ${list}`,
    'flag.additiveHigh.text': 'These are either banned somewhere or carry serious safety questions.',
    'flag.short.title': 'Short, recognisable ingredient list',
    'flag.short.text': 'Few ingredients and all of them recognisable — usually a good sign.',
    'flag.fiber.title': ({ value }: Params) => `High in fibre: ${value} g per 100 g`,
    'flag.fiber.text': 'Fibre is good for the gut and keeps you full for longer.',
    'flag.protein.title': ({ value }: Params) => `High in protein: ${value} g per 100 g`,
    'flag.protein.text': 'Protein is satiating and needed for muscle.',

    'rec.avoidAdditive': ({ name, code }: Params) => `Look for an alternative without ${name} (${code}).`,
    'rec.avoidAdditiveWhy': ({ reason }: Params) => reason,
    'rec.lessSugar': 'Choose a no-added-sugar version — plain yoghurt, say — and add sweetness with fruit.',
    'rec.lessSugarWhy': ({ value }: Params) => `This one has ${value} g of sugar per 100 g.`,
    'rec.lessSalt': 'Look for a reduced-salt version, or cook from unprocessed ingredients.',
    'rec.lessSaltWhy': ({ value }: Params) => `This has ${value} g of salt per 100 g against a 5 g daily guideline.`,
    'rec.avoidTransFat': 'Swap for a product made with non-hydrogenated vegetable oil or with butter.',
    'rec.avoidTransFatWhy': 'The WHO recommends eliminating industrial trans fats completely.',
    'rec.avoidNitrite': 'If you eat cured meats, have them less often and look for nitrite-free versions; use roasted meat for sandwiches.',
    'rec.avoidNitriteWhy': 'IARC classifies processed meat in Group 1 — proven human carcinogens.',
    'rec.preferShortList': 'Prefer a product with a shorter ingredient list: fewer lines means less industrial processing.',
    'rec.preferShortListWhy': ({ count }: Params) => `This one has ${count} ingredients.`,
    'rec.preferTocopherol': 'Look for a version where the antioxidant is tocopherols (E306, vitamin E) rather than BHA/BHT.',
    'rec.preferTocopherolWhy': 'Same effect, without the safety questions.',
    'rec.checkAllergen': ({ list }: Params) => `Check your tolerance: ${list}.`,
    'rec.checkAllergenWhy': 'These components most often cause reactions in sensitive people.',
    'rec.childCaution': "For children's food, look for a version without synthetic colours.",
    'rec.childCautionWhy': 'In the EU such colours must carry a warning about activity and attention in children.',
    'rec.childCautionOther': ({ list }: Params) => `For children's food, look for a version without ${list}.`,
    'rec.childCautionOtherWhy':
      'These additives have been studied in connection with activity and attention in children; for adults the question is far less pressing.',
    'rec.phenylketonuria': 'This product contains a source of phenylalanine and is contraindicated in phenylketonuria.',
    'rec.phenylketonuriaWhy': 'That is the one strict contraindication for aspartame.',
    'rec.laxative': 'Do not eat a lot at once: sugar alcohols in quantity cause bloating and loose stools.',
    'rec.laxativeWhy': 'For most people the threshold is around 20-30 g per sitting.',
    'rec.goodChoice': 'A good choice — go ahead.',
    'rec.goodChoiceWhy': 'No serious additives and no excess of sugar, salt or fat.',

    'warning.noIngredients': 'No ingredient list recognised. Try a closer photo of the label, or scan the barcode.',
    'warning.notInDatabase': 'This product is not in Open Food Facts. Photograph the ingredient list and we will read the label.',
    'warning.unknownCodes': ({ list }: Params) => `Unrecognised codes: ${list}. Possibly an OCR error.`,
    'warning.offOffline': 'The product database is unavailable; working from the photo only.',
    'warning.lowOcrConfidence': 'The text was only partly recognised — some of the ingredients may be missing.',
    'warning.noNutrition': 'Nutrition information is absent or was not recognised.',
    'warning.offline': 'Analysed on the phone with no connection: the product database and alternatives are unavailable.',
    'warning.offlineStale': ({ date }: Params) => `The additive reference was last updated ${date} — connect to refresh it.`,

    'alt.reason.betterScore': ({ score }: Params) => `Scores ${score} out of 100 — better than the scanned product.`,
  },
} as const;

export type MessageKey = keyof (typeof MESSAGES)['ru'];

/** Translates `key` into `locale`, interpolating `params` where the message needs them. */
export function t(locale: Locale, key: MessageKey, params: Params = {}): string {
  const message = MESSAGES[locale][key] as string | ((p: Params) => string);
  return typeof message === 'function' ? message(params) : message;
}

export function isLocale(value: unknown): value is Locale {
  return value === 'ru' || value === 'en';
}

/** Picks a supported locale from an `Accept-Language` header. */
export function localeFromHeader(header: string | undefined, fallback: Locale = 'ru'): Locale {
  if (!header) return fallback;
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase() ?? '';
    if (tag.startsWith('ru')) return 'ru';
    if (tag.startsWith('en')) return 'en';
  }
  return fallback;
}
