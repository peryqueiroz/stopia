import type { Group } from '../../shared/types';
import type { Room } from '../room';

/** Jogadores conectados, jogando a rodada, que não estão no grupo. */
export function eligibleVoters(room: Room, group: Group): string[] {
  return room.players.filter((p) => p.connected && p.playing && !(p.id in group.answers)).map((p) => p.id);
}

export function countVotes(room: Room, group: Group): number {
  const eligible = new Set(eligibleVoters(room, group));
  return group.votes.filter((v) => eligible.has(v)).length;
}

export function effectiveValid(room: Room, group: Group): boolean {
  const eligible = eligibleVoters(room, group).length;
  return countVotes(room, group) > eligible / 2 ? !group.valid : group.valid;
}

export function scoreRound(room: Room): Record<string, number> {
  const points: Record<string, number> = {};
  for (const p of room.players) if (p.playing) points[p.id] = 0;
  const judged = room.current?.judged ?? {};
  for (const category of room.config.categories) {
    for (const group of judged[category] ?? []) {
      if (!effectiveValid(room, group)) continue;
      const ids = Object.keys(group.answers);
      const pts = ids.length >= 2 ? 5 : 10;
      for (const id of ids) points[id] = (points[id] ?? 0) + pts;
    }
  }
  return points;
}
