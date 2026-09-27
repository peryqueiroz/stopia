import type { RoomConfig } from '../../shared/types';
import { ALL_LETTERS, LIMITS } from '../../shared/defaults';
import { normalize } from '../../shared/text';

const clampInt = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

export function sanitizeConfig(current: RoomConfig, patch: Partial<RoomConfig>): RoomConfig {
  const next: RoomConfig = { ...current };

  if (typeof patch.rounds === 'number' && Number.isFinite(patch.rounds)) {
    next.rounds = clampInt(patch.rounds, LIMITS.minRounds, LIMITS.maxRounds);
  }
  if (patch.time === 'short' || patch.time === 'medium' || patch.time === 'long') next.time = patch.time;
  if (patch.strictness === 'flexible' || patch.strictness === 'strict') next.strictness = patch.strictness;
  if (typeof patch.maxPlayers === 'number' && Number.isFinite(patch.maxPlayers)) {
    next.maxPlayers = clampInt(patch.maxPlayers, LIMITS.minPlayers, LIMITS.maxPlayers);
  }
  if (typeof patch.password === 'string') next.password = patch.password.trim().slice(0, LIMITS.maxPassword);

  if (Array.isArray(patch.categories)) {
    const seen = new Set<string>();
    const categories: string[] = [];
    for (const c of patch.categories) {
      if (typeof c !== 'string') continue;
      const name = c.replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxCategoryLength);
      const key = normalize(name);
      if (!name || seen.has(key)) continue;
      seen.add(key);
      categories.push(name);
    }
    if (categories.length > 0) next.categories = categories.slice(0, LIMITS.maxCategories);
  }

  if (Array.isArray(patch.letters)) {
    const letters = ALL_LETTERS.filter((l) => patch.letters!.includes(l));
    if (letters.length > 0) next.letters = letters;
  }

  return next;
}
