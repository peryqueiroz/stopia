import type { Group, RoomConfig } from '../../shared/types';
import { DURATIONS, TIME_SECONDS } from '../../shared/defaults';
import { cleanAnswer } from '../../shared/text';
import { findPlayer, log, type Room } from '../room';
import { sanitizeConfig } from './config';
import { eligibleVoters, scoreRound } from './scoring';

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
  room.current = { letter, answers: {}, stoppedBy: null, judged: null, reviewIndex: 0, skips: [], points: null };
  room.phase = 'drawing';
  room.phaseEndsAt = now + DURATIONS.drawingMs;
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
export function tick(room: Room, now: number, rng: Rng): boolean {
  if (room.phaseEndsAt === null || now < room.phaseEndsAt) return false;
  switch (room.phase) {
    case 'drawing':
      // só depois da roleta, para o mural não entregar a letra antes
      log(room, `Rodada ${room.round}: letra ${room.current!.letter}`);
      room.phase = 'answering';
      room.phaseEndsAt = now + TIME_SECONDS[room.config.time] * 1000;
      return true;
    case 'answering':
      log(room, 'Tempo esgotado!');
      lockAnswers(room);
      return true;
    case 'review':
      advanceReview(room, now);
      return true;
    case 'roundResult':
      if (room.round < room.config.rounds) {
        beginRound(room, now, rng);
      } else {
        room.phase = 'final';
        room.phaseEndsAt = null;
        log(room, 'Fim de jogo!');
      }
      return true;
    default:
      return false;
  }
}

export function applyJudgement(room: Room, judged: Record<string, Group[]>, aiFailed: boolean, now: number): boolean {
  if (room.phase !== 'validating' || !room.current) return false;
  room.current.judged = judged;
  room.current.reviewIndex = 0;
  room.phase = 'review';
  room.phaseEndsAt = now + DURATIONS.reviewPerCategoryMs;
  log(room, aiFailed ? 'IA indisponível: validem manualmente' : 'IA validou as respostas');
  return true;
}

export function currentGroups(room: Room): Group[] {
  const c = room.current;
  if (!c?.judged) return [];
  return c.judged[room.config.categories[c.reviewIndex]] ?? [];
}

/** Liga/desliga o voto de contestação num grupo da categoria em revisão. */
export function vote(room: Room, voterId: string, groupId: string): boolean {
  if (room.phase !== 'review') return false;
  const group = currentGroups(room).find((g) => g.id === groupId);
  if (!group || !eligibleVoters(room, group).includes(voterId)) return false;
  group.votes = group.votes.includes(voterId) ? group.votes.filter((v) => v !== voterId) : [...group.votes, voterId];
  return true;
}

/** Liga/desliga o "pular" do jogador; avança quando todos que jogam a rodada (e estão online) pularam. */
export function toggleSkip(room: Room, playerId: string, now: number): boolean {
  const c = room.current;
  const player = findPlayer(room, playerId);
  if (room.phase !== 'review' || !c || !player?.connected || !player.playing) return false;
  c.skips = c.skips.includes(playerId) ? c.skips.filter((id) => id !== playerId) : [...c.skips, playerId];
  if (room.players.every((p) => !p.connected || !p.playing || c.skips.includes(p.id))) advanceReview(room, now);
  return true;
}

function advanceReview(room: Room, now: number): void {
  const c = room.current!;
  c.skips = [];
  if (c.reviewIndex < room.config.categories.length - 1) {
    c.reviewIndex += 1;
    room.phaseEndsAt = now + DURATIONS.reviewPerCategoryMs;
    return;
  }
  c.points = scoreRound(room);
  for (const p of room.players) p.score += c.points[p.id] ?? 0;
  room.phase = 'roundResult';
  room.phaseEndsAt = now + DURATIONS.roundResultMs;
}

export function playAgain(room: Room, playerId: string): boolean {
  if (!isHost(room, playerId) || room.phase !== 'final') return false;
  room.phase = 'lobby';
  room.phaseEndsAt = null;
  room.round = 0;
  room.current = null;
  room.usedLetters = [];
  for (const p of room.players) {
    p.score = 0;
    p.playing = true;
  }
  return true;
}
