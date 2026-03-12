import { Platform, NativeModules } from 'react-native';
import { getSettings } from './storage';
import en from '../locales/en';
import fr from '../locales/fr';
import es from '../locales/es';
import de from '../locales/de';
import ptBR from '../locales/pt-BR';
import zh from '../locales/zh';
import type { TranslationStrings, DeepPartial } from '../locales/types';

// Re-export for any existing consumers
export type { TranslationStrings, DeepPartial };

export type LocaleCode = 'en' | 'fr' | 'es' | 'de' | 'pt-BR' | 'zh';

export interface LocaleInfo {
  code: LocaleCode;
  name: string; // Native name
  englishName: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', englishName: 'English' },
  { code: 'fr', name: 'Fran\u00e7ais', englishName: 'French' },
  { code: 'es', name: 'Espa\u00f1ol', englishName: 'Spanish' },
  { code: 'de', name: 'Deutsch', englishName: 'German' },
  { code: 'pt-BR', name: 'Portugu\u00eas', englishName: 'Portuguese' },
  { code: 'zh', name: '\u4e2d\u6587', englishName: 'Chinese' },
];

/** Deep-merge a partial locale over the English base so every key is guaranteed present */
function deepMerge(base: TranslationStrings, partial: DeepPartial<TranslationStrings>): TranslationStrings {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(partial)) {
    const val = (partial as Record<string, unknown>)[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof (base as Record<string, unknown>)[key] === 'object') {
      result[key] = deepMerge((base as Record<string, Record<string, unknown>>)[key] as TranslationStrings, val as DeepPartial<TranslationStrings>);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as TranslationStrings;
}

const translations: Record<LocaleCode, TranslationStrings> = {
  en,
  fr: deepMerge(en, fr),
  es: deepMerge(en, es),
  de: deepMerge(en, de),
  'pt-BR': deepMerge(en, ptBR),
  zh: deepMerge(en, zh),
};

// Current active locale
let currentLocale: LocaleCode = 'en';

/**
 * Detect device locale and map to supported locale.
 */
function getDeviceLocale(): LocaleCode {
  let deviceLang = 'en';

  try {
    if (Platform.OS === 'ios') {
      deviceLang =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'en';
    } else if (Platform.OS === 'android') {
      deviceLang = NativeModules.I18nManager?.localeIdentifier || 'en';
    } else {
      // Web
      deviceLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
    }
  } catch {
    deviceLang = 'en';
  }

  const lang = deviceLang.toLowerCase().replace('_', '-');

  // Check for exact match first
  if (lang === 'pt-br') return 'pt-BR';
  if (lang.startsWith('zh')) return 'zh';

  // Check prefix match
  const prefix = lang.split('-')[0];
  const match = SUPPORTED_LOCALES.find((l) => l.code.split('-')[0] === prefix);
  return match ? match.code : 'en';
}

/**
 * Set the active locale.
 */
export function setLocale(locale: LocaleCode): void {
  currentLocale = locale;
}

/**
 * Get the current active locale.
 */
export function getLocale(): LocaleCode {
  return currentLocale;
}

/**
 * Initialize locale from saved settings, falling back to device locale.
 */
export async function initLocale(): Promise<LocaleCode> {
  const settings = await getSettings();
  const stored = settings.locale;
  const isValid = stored && SUPPORTED_LOCALES.some((l) => l.code === stored);
  const locale = isValid ? (stored as LocaleCode) : getDeviceLocale();
  currentLocale = locale;
  return locale;
}

/**
 * Get a translated string by key path, with optional interpolation.
 *
 * Usage:
 *   t('home.playNow')                    -> "Play Now"
 *   t('home.dayStreak')                  -> "day streak"
 *   t('game.questionOf', { current: 3, total: 10 }) -> "3 / 10"
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: unknown = translations[currentLocale];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Fallback to English
      value = translations.en;
      for (const fk of keys) {
        if (value && typeof value === 'object' && fk in (value as Record<string, unknown>)) {
          value = (value as Record<string, unknown>)[fk];
        } else {
          return key; // Key not found at all
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') return key;

  if (!params) return value;

  return value.replace(/\{(\w+)\}/g, (_, k) => {
    return params[k] !== undefined ? String(params[k]) : `{${k}}`;
  });
}
