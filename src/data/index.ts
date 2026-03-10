import { FlagCategory, FlagItem } from '../types';
import { countries } from './countries';
import {
  usStates,
  canadianProvinces,
  australianStates,
  brazilianStates,
  germanStates,
  indianStates,
  japanesePrefectures,
  mexicanStates,
  spanishCommunities,
} from './subdivisions';

const flagsByCategory: Record<FlagCategory, FlagItem[]> = {
  countries,
  us_states: usStates,
  canadian_provinces: canadianProvinces,
  australian_states: australianStates,
  brazilian_states: brazilianStates,
  german_states: germanStates,
  indian_states: indianStates,
  japanese_prefectures: japanesePrefectures,
  mexican_states: mexicanStates,
  spanish_communities: spanishCommunities,
};

export function getFlagsForCategories(categories: FlagCategory[]): FlagItem[] {
  return categories.flatMap((cat) => flagsByCategory[cat] || []);
}

export function getAllFlags(): FlagItem[] {
  return Object.values(flagsByCategory).flat();
}

export function getCategoryCount(category: FlagCategory): number {
  return (flagsByCategory[category] || []).length;
}

export function getTotalFlagCount(): number {
  return getAllFlags().length;
}

export { countries, usStates, canadianProvinces, australianStates, brazilianStates, germanStates, indianStates, japanesePrefectures, mexicanStates, spanishCommunities };
