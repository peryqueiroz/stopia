import { randomUUID } from 'node:crypto';
import { DURATIONS, LIMITS } from '../shared/defaults';
import { findPlayer, log, newPlayer, newRoom, type Player, type Room } from './room';

export type JoinResult = { ok: true; room: Room; player: Player } | { ok: false; error: string };

export function cleanName(name: unknown): string {
  const n = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim().slice(0, LIMITS.maxName) : '';
  return n || 'Jogador';
}

export class RoomManager {
  rooms = new Map<string, Room>();

  constructor(
    private rng: () => number = Math.random,
    private newId: () => string = randomUUID,
  ) {}

  private newCode(): string {
    let code: string;
    do {
      code = String(10000 + Math.floor(this.rng() * 90000));
    } while (this.rooms.has(code));
    return code;
  }

  create(name: unknown, now: number): { room: Room; player: Player } {
    const player = newPlayer(this.newId(), cleanName(name), now);
    const room = newRoom(this.newCode(), player, now);
    log(room, `${player.name} criou a sala`);
    this.rooms.set(room.code, room);
    return { room, player };
  }

  join(code: string, name: unknown, password: string, playerId: string | undefined, now: number): JoinResult {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'Sala não encontrada' };

    const existing = playerId ? findPlayer(room, playerId) : undefined;
    if (existing) {
      existing.connected = true;
      existing.disconnectedAt = null;
      room.lastActivity = now;
      return { ok: true, room, player: existing };
    }

    if (room.config.password && password !== room.config.password) return { ok: false, error: 'Senha incorreta' };
    if (room.players.length >= room.config.maxPlayers) return { ok: false, error: 'Sala cheia' };

    const player = newPlayer(this.newId(), cleanName(name), now);
    player.playing = room.phase === 'lobby';
    room.players.push(player);
    room.lastActivity = now;
    log(room, `${player.name} entrou`);
    return { ok: true, room, player };
  }

  disconnect(code: string, playerId: string, now: number): void {
    const room = this.rooms.get(code);
    const player = room && findPlayer(room, playerId);
    if (!player) return;
    player.connected = false;
    player.disconnectedAt = now;
  }

  leave(code: string, playerId: string, _now: number): void {
    const room = this.rooms.get(code);
    if (!room) return;
    this.removePlayer(room, playerId);
    if (room.players.length === 0) this.rooms.delete(code);
  }

  /** Remove quem está offline há ≥ 60s e salas vazias/ociosas. Retorna salas que mudaram e continuam existindo. */
  sweep(now: number): Room[] {
    const changed: Room[] = [];
    for (const room of [...this.rooms.values()]) {
      const gone = room.players.filter(
        (p) => !p.connected && p.disconnectedAt !== null && now - p.disconnectedAt >= DURATIONS.reconnectMs,
      );
      for (const p of gone) this.removePlayer(room, p.id);
      const idle = now - room.lastActivity >= DURATIONS.idleRoomMs && !room.players.some((p) => p.connected);
      if (room.players.length === 0 || idle) {
        this.rooms.delete(room.code);
        continue;
      }
      if (gone.length > 0) changed.push(room);
    }
    return changed;
  }

  private removePlayer(room: Room, playerId: string): void {
    const player = findPlayer(room, playerId);
    if (!player) return;
    room.players = room.players.filter((p) => p.id !== playerId);
    log(room, `${player.name} saiu`);
    if (room.hostId === playerId && room.players.length > 0) {
      const next = room.players.find((p) => p.connected) ?? room.players[0];
      room.hostId = next.id;
      log(room, `${next.name} agora é o dono da sala`);
    }
  }
}
