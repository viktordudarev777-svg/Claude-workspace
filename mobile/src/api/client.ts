import Constants from 'expo-constants';
import type {
  AdditiveDetail, AdditiveSummary, AnalysisResult, HistoryEntry, HistoryStats, Locale,
} from './types';

/**
 * On a device, `localhost` is the phone itself. Set `apiBaseUrl` in app.json
 * (or `EXPO_PUBLIC_API_URL`) to your machine's LAN address when running on
 * hardware; the emulator hosts are handled below.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromConfig = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;
  const configured = (fromConfig ?? 'http://localhost:4000').replace(/\/$/, '');

  // When Metro serves over the LAN, the dev machine is reachable at the same
  // host the bundle came from — a much better default than localhost.
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && /localhost|127\.0\.0\.1/.test(configured)) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:${new URL(configured).port || '4000'}`;
  }
  return configured;
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestContext {
  deviceId: string;
  locale: Locale;
}

const TIMEOUT_MS = 20_000;

async function request<T>(
  path: string,
  context: RequestContext,
  init: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(`${API_BASE_URL}${path}${separator}locale=${context.locale}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': context.deviceId,
        'Accept-Language': context.locale,
        ...init.headers,
      },
    });

    if (response.status === 204) return undefined as T;

    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      throw new ApiError(
        response.status,
        String(body.error ?? 'unknown_error'),
        String(body.message ?? `Request failed with ${response.status}`),
      );
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'timeout', 'Сервер не ответил вовремя');
    }
    throw new ApiError(0, 'network_error', 'Нет связи с сервером');
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  analyzeBarcode: (barcode: string, context: RequestContext) =>
    request<AnalysisResult>('/api/v1/analyze/barcode', context, {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    }),

  analyzeLabel: (
    text: string,
    context: RequestContext,
    options: { barcode?: string; ocrConfidence?: number } = {},
  ) =>
    request<AnalysisResult>('/api/v1/analyze/label', context, {
      method: 'POST',
      body: JSON.stringify({ text, ...options }),
    }),

  analyzePhoto: (imageBase64: string, context: RequestContext) =>
    request<AnalysisResult>('/api/v1/analyze/photo', context, {
      method: 'POST',
      body: JSON.stringify({ imageBase64 }),
    }),

  history: (context: RequestContext, options: { limit?: number; favorites?: boolean } = {}) =>
    request<{ items: HistoryEntry[] }>(
      `/api/v1/history?limit=${options.limit ?? 50}${options.favorites ? '&favorites=true' : ''}`,
      context,
    ),

  historyStats: (context: RequestContext) => request<HistoryStats>('/api/v1/history/stats', context),

  scan: (id: string, context: RequestContext) => request<AnalysisResult>(`/api/v1/history/${id}`, context),

  setFavorite: (id: string, favorite: boolean, context: RequestContext) =>
    request<{ id: string; favorite: boolean }>(`/api/v1/history/${id}/favorite`, context, {
      method: 'POST',
      body: JSON.stringify({ favorite }),
    }),

  deleteScan: (id: string, context: RequestContext) =>
    request<void>(`/api/v1/history/${id}`, context, { method: 'DELETE' }),

  additives: (context: RequestContext, query = '') =>
    request<{ total: number; items: AdditiveSummary[] }>(
      `/api/v1/additives?q=${encodeURIComponent(query)}`,
      context,
    ),

  additive: (code: string, context: RequestContext) =>
    request<AdditiveDetail>(`/api/v1/additives/${encodeURIComponent(code)}`, context),
};
