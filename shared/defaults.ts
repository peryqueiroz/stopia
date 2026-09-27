import type { RoomConfig } from './types';

export const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const DEFAULT_LETTERS = ALL_LETTERS.filter((l) => !'HJKNQUWXYZ'.includes(l));

export const TIME_SECONDS = { short: 60, medium: 90, long: 120 } as const;

export const DEFAULT_CATEGORIES = [
  'Nome', 'Animal', 'Cor', 'Fruta', 'Objeto', 'Marca',
  'Filme', 'Série', 'Profissão', 'Cidade', 'Comida', 'Parte do corpo',
];

export const LIMITS = {
  minRounds: 1,
  maxRounds: 15,
  maxCategories: 16,
  maxCategoryLength: 30,
  minPlayers: 2,
  maxPlayers: 10,
  maxName: 16,
  maxPassword: 20,
} as const;

export const DURATIONS = {
  drawingMs: 3_000,
  reviewPerCategoryMs: 15_000,
  roundResultMs: 8_000,
  reconnectMs: 60_000,
  idleRoomMs: 30 * 60_000,
} as const;

export const DEFAULT_CONFIG: RoomConfig = {
  rounds: 8,
  time: 'medium',
  categories: DEFAULT_CATEGORIES,
  letters: DEFAULT_LETTERS,
  strictness: 'flexible',
  maxPlayers: 10,
  password: '',
};
