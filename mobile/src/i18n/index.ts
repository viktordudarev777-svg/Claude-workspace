import { getLocales } from 'expo-localization';
import type { Locale, RiskLevel } from '../api/types';

/**
 * UI chrome only. Everything about a product — verdicts, explanations,
 * recommendations — is translated by the API, so this file stays small.
 */
const STRINGS = {
  ru: {
    'tab.scan': 'Сканер',
    'tab.history': 'История',
    'tab.additives': 'Добавки',
    'tab.settings': 'Ещё',

    'scan.title': 'Наведите камеру',
    'scan.hintBarcode': 'Штрихкод распознается сам — это самый точный способ',
    'scan.hintLabel': 'Или сфотографируйте состав на этикетке',
    'scan.shootLabel': 'Снять состав',
    'scan.shootProduct': 'Снять продукт',
    'scan.permissionTitle': 'Нужен доступ к камере',
    'scan.permissionBody': 'Без камеры приложение не сможет прочитать этикетку или штрихкод.',
    'scan.permissionButton': 'Разрешить',
    'scan.analyzing': 'Разбираем состав…',
    'scan.manualEntry': 'Ввести штрихкод вручную',
    'scan.manualPlaceholder': 'Например, 4600000000008',
    'scan.manualSubmit': 'Проверить',
    'scan.cancel': 'Отмена',

    'result.score': 'из 100',
    'result.nutriScore': 'Nutri-Score',
    'result.additives': 'Что в составе',
    'result.noAdditives': 'Пищевых добавок не найдено',
    'result.nutrition': 'Пищевая ценность на 100 г',
    'result.flags': 'На что обратить внимание',
    'result.recommendations': 'Что делать',
    'result.alternatives': 'Чем заменить',
    'result.ingredients': 'Состав полностью',
    'result.warnings': 'Оговорки',
    'result.confidence': 'Уверенность распознавания',
    'result.source.barcode': 'по штрихкоду',
    'result.source.label-ocr': 'по этикетке',
    'result.source.photo': 'по фотографии',
    'result.save': 'В избранное',
    'result.saved': 'В избранном',
    'result.rescan': 'Сканировать ещё',
    'result.matchedAs': 'найдено как',

    'history.title': 'История',
    'history.empty': 'Пока пусто. Отсканируйте первый продукт.',
    'history.favorites': 'Избранное',
    'history.all': 'Все',
    'history.delete': 'Удалить',
    'history.stats': 'Всего проверено: {total} · средняя оценка {score}',

    'additives.title': 'Справочник добавок',
    'additives.search': 'Код или название, например E621',
    'additives.empty': 'Ничего не нашлось',
    'additives.adi': 'Допустимая доза',
    'additives.adiValue': '{value} мг на кг веса в день',
    'additives.adiNone': 'не установлена',
    'additives.origin': 'Происхождение',
    'additives.restricted': 'Ограничен или запрещён',
    'additives.sources': 'Источники',
    'additives.alsoKnown': 'Другие названия',

    'settings.title': 'Настройки',
    'settings.language': 'Язык',
    'settings.server': 'Адрес сервера',
    'settings.privacy': 'Приватность',
    'settings.privacyBody':
      'Аккаунта нет. История хранится на сервере под случайным идентификатором устройства, который создаётся при первом запуске. Ни имени, ни почты, ни телефона приложение не собирает.',
    'settings.disclaimer': 'Важно',
    'settings.disclaimerBody':
      'Приложение помогает разобраться в составе, но не заменяет врача и не ставит диагнозов. При аллергии, беременности и хронических заболеваниях ориентируйтесь на рекомендации своего врача.',
    'settings.deviceId': 'Идентификатор устройства',

    'risk.none': 'Без вопросов',
    'risk.low': 'Низкий риск',
    'risk.moderate': 'Средний риск',
    'risk.high': 'Высокий риск',

    'error.title': 'Не получилось',
    'error.retry': 'Повторить',
    'common.close': 'Закрыть',
  },
  en: {
    'tab.scan': 'Scan',
    'tab.history': 'History',
    'tab.additives': 'Additives',
    'tab.settings': 'More',

    'scan.title': 'Point the camera',
    'scan.hintBarcode': 'A barcode is detected automatically — the most accurate route',
    'scan.hintLabel': 'Or photograph the ingredient list on the pack',
    'scan.shootLabel': 'Shoot the label',
    'scan.shootProduct': 'Shoot the product',
    'scan.permissionTitle': 'Camera access needed',
    'scan.permissionBody': 'Without the camera the app cannot read a label or a barcode.',
    'scan.permissionButton': 'Allow',
    'scan.analyzing': 'Reading the label…',
    'scan.manualEntry': 'Enter a barcode by hand',
    'scan.manualPlaceholder': 'For example, 4600000000008',
    'scan.manualSubmit': 'Check',
    'scan.cancel': 'Cancel',

    'result.score': 'out of 100',
    'result.nutriScore': 'Nutri-Score',
    'result.additives': 'What is inside',
    'result.noAdditives': 'No food additives found',
    'result.nutrition': 'Nutrition per 100 g',
    'result.flags': 'Worth knowing',
    'result.recommendations': 'What to do',
    'result.alternatives': 'Try instead',
    'result.ingredients': 'Full ingredient list',
    'result.warnings': 'Caveats',
    'result.confidence': 'Recognition confidence',
    'result.source.barcode': 'from the barcode',
    'result.source.label-ocr': 'from the label',
    'result.source.photo': 'from the photo',
    'result.save': 'Save',
    'result.saved': 'Saved',
    'result.rescan': 'Scan another',
    'result.matchedAs': 'matched as',

    'history.title': 'History',
    'history.empty': 'Nothing yet. Scan your first product.',
    'history.favorites': 'Saved',
    'history.all': 'All',
    'history.delete': 'Delete',
    'history.stats': 'Scanned: {total} · average score {score}',

    'additives.title': 'Additive reference',
    'additives.search': 'Code or name, e.g. E621',
    'additives.empty': 'Nothing found',
    'additives.adi': 'Acceptable daily intake',
    'additives.adiValue': '{value} mg per kg of body weight per day',
    'additives.adiNone': 'not specified',
    'additives.origin': 'Origin',
    'additives.restricted': 'Restricted or banned in',
    'additives.sources': 'Sources',
    'additives.alsoKnown': 'Also known as',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.server': 'Server address',
    'settings.privacy': 'Privacy',
    'settings.privacyBody':
      'There is no account. History is stored on the server under a random device identifier created on first launch. The app collects no name, email or phone number.',
    'settings.disclaimer': 'Important',
    'settings.disclaimerBody':
      'This app helps you understand an ingredient list. It does not replace a doctor and does not diagnose anything. With allergies, pregnancy or a chronic condition, follow your doctor’s advice.',
    'settings.deviceId': 'Device identifier',

    'risk.none': 'No concerns',
    'risk.low': 'Low risk',
    'risk.moderate': 'Moderate risk',
    'risk.high': 'High risk',

    'error.title': 'That did not work',
    'error.retry': 'Try again',
    'common.close': 'Close',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['ru'];

export function translate(locale: Locale, key: StringKey, params: Record<string, string | number> = {}): string {
  const template: string = STRINGS[locale][key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
}

export function riskLabel(locale: Locale, risk: RiskLevel): string {
  return translate(locale, `risk.${risk}` as StringKey);
}

/** The phone's language, when we support it. */
export function deviceLocale(): Locale {
  const tag = getLocales()[0]?.languageCode ?? 'ru';
  return tag === 'en' ? 'en' : 'ru';
}
