import { CategoryId, FlagItem } from '../types';
import { countries } from './countries';

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

export { countries };
