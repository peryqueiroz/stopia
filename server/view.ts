import type { RoomView } from '../shared/types';
import { effectiveValid, eligibleVoters } from './game/scoring';
import type { Room } from './room';

export function toView(room: Room, me: string, now: number): RoomView {
  const c = room.current;

  let review: RoomView['review'] = null;
  if (room.phase === 'review' && c?.judged) {
    const category = room.config.categories[c.reviewIndex];
    review = {
      categoryIndex: c.reviewIndex,
      category,
      groups: (c.judged[category] ?? []).map((g) => ({
        ...g,
        votes: [...g.votes],
        effectiveValid: effectiveValid(room, g),
        eligibleVoters: eligibleVoters(room, g).length,
        mine: me in g.answers,
      })),
    };
  }

  const showRoundPoints = room.phase === 'roundResult' || room.phase === 'final';

  return {
    code: room.code,
    me,
    hostId: room.hostId,
    phase: room.phase,
    config: {
      ...room.config,
      password: me === room.hostId ? room.config.password : '',
      hasPassword: room.config.password !== '',
    },
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      score: p.score,
      connected: p.connected,
      playing: p.playing,
      isHost: p.id === room.hostId,
      roundPoints: showRoundPoints ? (c?.points?.[p.id] ?? null) : null,
    })),
    round: room.round,
    letter: c?.letter ?? null,
    phaseEndsAt: room.phaseEndsAt,
    serverNow: now,
    myAnswers: c?.answers[me] ?? {},
    stoppedBy: c?.stoppedBy ?? null,
    review,
    events: room.events,
  };
}
