import type { Group, Phase, RoomConfig, RoomEvent } from '../shared/types';
import { DEFAULT_CONFIG } from '../shared/defaults';

export interface Player {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
  connected: boolean;
  disconnectedAt: number | null;
  score: number;
  /** false para quem entrou no meio da rodada */
  playing: boolean;
}

export interface RoundState {
  letter: string;
  /** playerId -> categoria -> resposta */
  answers: Record<string, Record<string, string>>;
  stoppedBy: string | null;
  /** categoria -> grupos julgados */
  judged: Record<string, Group[]> | null;
  reviewIndex: number;
  points: Record<string, number> | null;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  config: RoomConfig;
  phase: Phase;
  phaseEndsAt: number | null;
  round: number;
  usedLetters: string[];
  current: RoundState | null;
  events: RoomEvent[];
  nextEventId: number;
  lastActivity: number;
}

const COLORS = ['#F2C94C', '#56CCF2', '#6FCF97', '#EB5757', '#BB6BD9', '#F2994A', '#2DD4BF', '#F472B6'];

export function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function newPlayer(id: string, name: string, now: number): Player {
  return { id, name, color: colorFor(name), joinedAt: now, connected: true, disconnectedAt: null, score: 0, playing: true };
}

export function newRoom(code: string, host: Player, now: number): Room {
  return {
    code,
    hostId: host.id,
    players: [host],
    config: structuredClone(DEFAULT_CONFIG),
    phase: 'lobby',
    phaseEndsAt: null,
    round: 0,
    usedLetters: [],
    current: null,
    events: [],
    nextEventId: 1,
    lastActivity: now,
  };
}

export function log(room: Room, text: string): void {
  room.events.push({ id: room.nextEventId++, text });
  if (room.events.length > 20) room.events.shift();
}

export function findPlayer(room: Room, id: string) {
  return room.players.find((p) => p.id === id);
}
