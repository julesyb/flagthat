import type en from './en';

/** The full translation shape, derived from the English source of truth */
export type TranslationStrings = typeof en;

/** Recursive partial — locale files only need to override translated keys */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
