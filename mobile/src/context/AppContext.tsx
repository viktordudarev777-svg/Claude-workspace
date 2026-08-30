import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { Locale } from '../api/types';
import type { RequestContext } from '../api/client';
import { deviceLocale, translate, type StringKey } from '../i18n';

const DEVICE_ID_KEY = 'foodlens.deviceId';
const LOCALE_KEY = 'foodlens.locale';

interface AppState {
  deviceId: string | null;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Everything the API client needs; `null` until the device id is ready. */
  context: RequestContext | null;
  t: (key: StringKey, params?: Record<string, string | number>) => string;
}

const AppContextValue = createContext<AppState | null>(null);

/**
 * The app's only global state: who we are (a random device id) and which
 * language to ask the API for.
 *
 * The device id is generated once and kept in local storage. It is the only
 * identifier that ever leaves the phone — no account, no email, no analytics id.
 */
export function AppProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<Locale>(deviceLocale());

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [storedId, storedLocale] = await Promise.all([
        AsyncStorage.getItem(DEVICE_ID_KEY),
        AsyncStorage.getItem(LOCALE_KEY),
      ]);
      if (cancelled) return;

      let id = storedId;
      if (!id) {
        id = Crypto.randomUUID();
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }
      setDeviceId(id);
      if (storedLocale === 'ru' || storedLocale === 'en') setLocaleState(storedLocale);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppState>(
    () => ({
      deviceId,
      locale,
      setLocale: (next: Locale) => {
        setLocaleState(next);
        void AsyncStorage.setItem(LOCALE_KEY, next);
      },
      context: deviceId ? { deviceId, locale } : null,
      t: (key, params) => translate(locale, key, params),
    }),
    [deviceId, locale],
  );

  return <AppContextValue.Provider value={value}>{children}</AppContextValue.Provider>;
}

export function useApp(): AppState {
  const value = useContext(AppContextValue);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
}
