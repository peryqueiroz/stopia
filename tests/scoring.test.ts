import { describe, it, expect } from 'vitest';
import { newPlayer, newRoom, type Room } from '../server/room';
import * as game from '../server/game/game';
import { effectiveValid, scoreRound } from '../server/game/scoring';
import type { Group } from '../shared/types';

const rng0 = () => 0;

function setup(n = 3): Room {
  const room = newRoom('12345', newPlayer('p1', 'Ana', 0), 0);
  for (let i = 2; i <= n; i++) room.players.push(newPlayer(`p${i}`, `J${i}`, 0));
  room.config.categories = ['Série'];
  room.config.letters = ['G'];
  room.config.rounds = 2;
  return room;
}

function g(id: string, answers: Record<string, string>, valid = true): Group {
  return { id, canonical: Object.values(answers)[0], answers, valid, pending: false, reason: '', votes: [] };
}

/** 0: sorteio → 3000: respostas → 93000: validando → 100000: revisão (até 115000) */
function toReview(room: Room, judged: Record<string, Group[]>) {
  game.startGame(room, 'p1', 0, rng0);
  game.tick(room, 3_000, rng0);
  game.tick(room, 93_000, rng0);
  game.applyJudgement(room, judged, false, 100_000);
}

describe('pontuação', () => {
  it('10 para válida única, 5 para equivalentes, 0 para inválida', () => {
    const room = setup();
    toReview(room, { Série: [g('0-0', { p1: 'game of thrones', p2: 'got' }), g('0-1', { p3: 'gossip girl' })] });
    expect(scoreRound(room)).toEqual({ p1: 5, p2: 5, p3: 10 });
    room.current!.judged!['Série'][1].valid = false;
    expect(scoreRound(room)).toEqual({ p1: 5, p2: 5, p3: 0 });
  });
});

describe('contestação', () => {
  it('maioria dos outros jogadores inverte o veredito', () => {
    const room = setup();
    toReview(room, { Série: [g('0-0', { p1: 'gato' }, false)] });
    const grp = room.current!.judged!['Série'][0];
    expect(game.vote(room, 'p2', '0-0')).toBe(true);
    expect(effectiveValid(room, grp)).toBe(false); // 1 de 2 não é maioria
    expect(game.vote(room, 'p3', '0-0')).toBe(true);
    expect(effectiveValid(room, grp)).toBe(true);
  });

  it('não vota na própria resposta; segundo clique desfaz o voto', () => {
    const room = setup();
    toReview(room, { Série: [g('0-0', { p1: 'gato' })] });
    expect(game.vote(room, 'p1', '0-0')).toBe(false);
    game.vote(room, 'p2', '0-0');
    game.vote(room, 'p2', '0-0');
    expect(room.current!.judged!['Série'][0].votes).toEqual([]);
  });

  it('quem não joga a rodada ou está offline não vota', () => {
    const room = setup();
    toReview(room, { Série: [g('0-0', { p1: 'gato' })] });
    room.players[1].playing = false;
    room.players[2].connected = false;
    expect(game.vote(room, 'p2', '0-0')).toBe(false);
    expect(game.vote(room, 'p3', '0-0')).toBe(false);
  });

  it('jogando sozinho não há contestação', () => {
    const room = setup(1);
    toReview(room, { Série: [g('0-0', { p1: 'gato' }, false)] });
    expect(game.vote(room, 'p1', '0-0')).toBe(false);
    expect(scoreRound(room)).toEqual({ p1: 0 });
  });
});

describe('fluxo da revisão até o fim do jogo', () => {
  it('revisa categorias, pontua, avança rodadas e termina', () => {
    const room = setup(2);
    room.config.categories = ['Série', 'Animal'];
    toReview(room, { Série: [g('0-0', { p1: 'got' })], Animal: [g('1-0', { p2: 'gato' })] });
    expect(room.phase).toBe('review');
    expect(room.phaseEndsAt).toBe(115_000);

    expect(game.nextCategory(room, 'p2', 100_000)).toBe(false);
    expect(game.nextCategory(room, 'p1', 100_000)).toBe(true);
    expect(room.current!.reviewIndex).toBe(1);

    game.tick(room, 115_000, rng0);
    expect(room.phase).toBe('roundResult');
    expect(room.players.map((p) => p.score)).toEqual([10, 10]);

    game.tick(room, 123_000, rng0);
    expect(room.phase).toBe('drawing');
    expect(room.round).toBe(2);

    game.tick(room, 126_000, rng0); // respostas
    game.tick(room, 216_000, rng0); // tempo esgotado
    game.applyJudgement(room, { Série: [], Animal: [] }, false, 216_000);
    game.tick(room, 231_000, rng0);
    game.tick(room, 246_000, rng0);
    expect(room.phase).toBe('roundResult');
    game.tick(room, 254_000, rng0);
    expect(room.phase).toBe('final');

    expect(game.playAgain(room, 'p2')).toBe(false);
    expect(game.playAgain(room, 'p1')).toBe(true);
    expect(room.phase).toBe('lobby');
    expect(room.players.map((p) => p.score)).toEqual([0, 0]);
  });
});
