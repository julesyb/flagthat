import { CategoryId, FlagItem } from '../types';
import { countries } from './countries';
import { twinPairs } from './countryAliases';

export function getFlagsForCategory(categoryId: CategoryId): FlagItem[] {
  if (categoryId === 'all') return countries;
  return countries.filter((flag) => flag.tags.includes(categoryId));
}

export function getAllFlags(): FlagItem[] {
  return countries;
}

export function getCategoryCount(categoryId: CategoryId): number {
  return getFlagsForCategory(categoryId).length;
}

export function getTotalFlagCount(): number {
  return countries.length;
}

export function getTwins(countryName: string): string[] {
  return twinPairs[countryName] || [];
}

const flagByName = new Map<string, FlagItem>(countries.map((c) => [c.name, c]));

export function getFlagByName(name: string): FlagItem | undefined {
  return flagByName.get(name);
}

export { countries, twinPairs };
