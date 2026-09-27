import { describe, it, expect } from 'vitest';
import { newPlayer, newRoom, type Room } from '../server/room';
import * as game from '../server/game/game';

const rng0 = () => 0;

function setup(n = 2): Room {
  const room = newRoom('12345', newPlayer('p1', 'Ana', 0), 0);
  for (let i = 2; i <= n; i++) room.players.push(newPlayer(`p${i}`, `J${i}`, 0));
  room.config.categories = ['Animal', 'Fruta'];
  room.config.letters = ['A', 'B'];
  room.config.rounds = 2;
  return room;
}

function toAnswering(room: Room) {
  game.startGame(room, 'p1', 0, rng0);
  game.tick(room, 3_000, rng0);
}

describe('início e sorteio', () => {
  it('só o dono inicia, e só no lobby', () => {
    const room = setup();
    expect(game.startGame(room, 'p2', 0, rng0)).toBe(false);
    expect(game.startGame(room, 'p1', 0, rng0)).toBe(true);
    expect(room.phase).toBe('drawing');
    expect(room.round).toBe(1);
    expect(room.current!.letter).toBe('A');
    expect(room.phaseEndsAt).toBe(3_000);
    expect(game.startGame(room, 'p1', 0, rng0)).toBe(false);
  });

  it('sorteio não repete letra e recomeça quando as letras acabam', () => {
    const used: string[] = [];
    expect(game.drawLetter(['A', 'B'], used, rng0)).toBe('A');
    expect(game.drawLetter(['A', 'B'], used, rng0)).toBe('B');
    expect(game.drawLetter(['A', 'B'], used, rng0)).toBe('A');
    expect(used).toEqual(['A']);
  });

  it('sorteio vira respostas após 3s, com o tempo da config', () => {
    const room = setup();
    game.startGame(room, 'p1', 0, rng0);
    expect(game.tick(room, 2_999, rng0)).toBe(false);
    expect(game.tick(room, 3_000, rng0)).toBe(true);
    expect(room.phase).toBe('answering');
    expect(room.phaseEndsAt).toBe(3_000 + 90_000);
  });
});

describe('respostas e STOP', () => {
  it('limpa respostas e ignora categorias desconhecidas', () => {
    const room = setup();
    toAnswering(room);
    game.setAnswers(room, 'p1', { Animal: '  Abelha  ', Hacker: 'x' });
    expect(room.current!.answers.p1).toEqual({ Animal: 'Abelha', Fruta: '' });
  });

  it('rejeita respostas fora da fase de respostas', () => {
    const room = setup();
    expect(game.setAnswers(room, 'p1', { Animal: 'Abelha' })).toBe(false);
  });

  it('STOP só com tudo preenchido e trava a rodada para todos', () => {
    const room = setup();
    toAnswering(room);
    game.setAnswers(room, 'p1', { Animal: 'Abelha', Fruta: '   ' });
    expect(game.stop(room, 'p1', 5_000)).toBe(false);
    game.setAnswers(room, 'p1', { Animal: 'Abelha', Fruta: 'Abacate' });
    expect(game.stop(room, 'p1', 5_000)).toBe(true);
    expect(room.phase).toBe('validating');
    expect(room.phaseEndsAt).toBeNull();
    expect(room.current!.stoppedBy).toBe('p1');
    expect(room.events.at(-1)!.text).toBe('Ana gritou STOP!');
    expect(game.setAnswers(room, 'p2', { Animal: 'Arara', Fruta: 'Açaí' })).toBe(false);
  });

  it('fim do tempo trava a rodada sem stoppedBy', () => {
    const room = setup();
    toAnswering(room);
    expect(game.tick(room, 93_000, rng0)).toBe(true);
    expect(room.phase).toBe('validating');
    expect(room.current!.stoppedBy).toBeNull();
    expect(room.events.at(-1)!.text).toBe('Tempo esgotado!');
  });

  it('quem não está jogando a rodada não responde nem para', () => {
    const room = setup();
    toAnswering(room);
    room.players[1].playing = false;
    expect(game.setAnswers(room, 'p2', { Animal: 'Arara', Fruta: 'Açaí' })).toBe(false);
    expect(game.canStop(room, 'p2')).toBe(false);
  });
});

describe('configuração', () => {
  it('só o dono muda, e só no lobby', () => {
    const room = setup();
    expect(game.updateConfig(room, 'p2', { rounds: 3 })).toBe(false);
    expect(game.updateConfig(room, 'p1', { rounds: 3 })).toBe(true);
    expect(room.config.rounds).toBe(3);
    game.startGame(room, 'p1', 0, rng0);
    expect(game.updateConfig(room, 'p1', { rounds: 5 })).toBe(false);
  });
});
