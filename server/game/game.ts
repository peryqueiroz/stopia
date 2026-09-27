import type { RoomConfig } from '../../shared/types';
import { DURATIONS, TIME_SECONDS } from '../../shared/defaults';
import { cleanAnswer } from '../../shared/text';
import { findPlayer, log, type Room } from '../room';
import { sanitizeConfig } from './config';

export type Rng = () => number;

const isHost = (room: Room, id: string) => room.hostId === id;

export function updateConfig(room: Room, playerId: string, patch: Partial<RoomConfig>): boolean {
  if (!isHost(room, playerId) || room.phase !== 'lobby') return false;
  room.config = sanitizeConfig(room.config, patch);
  return true;
}

/** Sorteia sem repetir; quando as letras acabam, recomeça o ciclo. Muta `used`. */
export function drawLetter(letters: string[], used: string[], rng: Rng): string {
  let pool = letters.filter((l) => !used.includes(l));
  if (pool.length === 0) {
    used.length = 0;
    pool = [...letters];
  }
  const letter = pool[Math.floor(rng() * pool.length)];
  used.push(letter);
  return letter;
}

export function startGame(room: Room, playerId: string, now: number, rng: Rng): boolean {
  if (!isHost(room, playerId) || room.phase !== 'lobby') return false;
  room.round = 0;
  room.usedLetters = [];
  for (const p of room.players) p.score = 0;
  beginRound(room, now, rng);
  return true;
}

function beginRound(room: Room, now: number, rng: Rng): void {
  room.round += 1;
  const letter = drawLetter(room.config.letters, room.usedLetters, rng);
  for (const p of room.players) p.playing = p.connected;
  room.current = { letter, answers: {}, stoppedBy: null, judged: null, reviewIndex: 0, points: null };
  room.phase = 'drawing';
  room.phaseEndsAt = now + DURATIONS.drawingMs;
  log(room, `Rodada ${room.round}: letra ${letter}`);
}

export function setAnswers(room: Room, playerId: string, answers: Record<string, string>): boolean {
  const player = findPlayer(room, playerId);
  if (room.phase !== 'answering' || !room.current || !player?.playing) return false;
  const clean: Record<string, string> = {};
  for (const cat of room.config.categories) {
    const v = answers?.[cat];
    clean[cat] = typeof v === 'string' ? cleanAnswer(v) : '';
  }
  room.current.answers[playerId] = clean;
  return true;
}

export function canStop(room: Room, playerId: string): boolean {
  const player = findPlayer(room, playerId);
  const mine = room.current?.answers[playerId];
  return (
    room.phase === 'answering' &&
    !!player?.playing &&
    !!mine &&
    room.config.categories.every((c) => (mine[c] ?? '') !== '')
  );
}

export function stop(room: Room, playerId: string, _now: number): boolean {
  if (!canStop(room, playerId)) return false;
  room.current!.stoppedBy = playerId;
  log(room, `${findPlayer(room, playerId)!.name} gritou STOP!`);
  lockAnswers(room);
  return true;
}

function lockAnswers(room: Room): void {
  room.phase = 'validating';
  room.phaseEndsAt = null;
}

/** Avança fases por tempo. Retorna true se algo mudou. */
export function tick(room: Room, now: number, _rng: Rng): boolean {
  if (room.phaseEndsAt === null || now < room.phaseEndsAt) return false;
  switch (room.phase) {
    case 'drawing':
      room.phase = 'answering';
      room.phaseEndsAt = now + TIME_SECONDS[room.config.time] * 1000;
      return true;
    case 'answering':
      log(room, 'Tempo esgotado!');
      lockAnswers(room);
      return true;
    default:
      return false;
  }
}
