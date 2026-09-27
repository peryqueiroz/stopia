import { describe, it, expect } from 'vitest';
import { RoomManager } from '../server/rooms';
import { toView } from '../server/view';
import * as game from '../server/game/game';

function manager() {
  let r = 0;
  let n = 0;
  return new RoomManager(
    () => (r = (r + 0.137) % 1),
    () => `id${++n}`,
  );
}

describe('RoomManager', () => {
  it('cria sala com código de 5 dígitos e o criador como dono', () => {
    const m = manager();
    const { room, player } = m.create('  Ana  ', 0);
    expect(room.code).toMatch(/^\d{5}$/);
    expect(room.hostId).toBe(player.id);
    expect(player.name).toBe('Ana');
    expect(m.create('   ', 0).player.name).toBe('Jogador');
    expect(m.create('x'.repeat(30), 0).player.name).toHaveLength(16);
  });

  it('recusa sala inexistente, senha errada e sala cheia', () => {
    const m = manager();
    const { room } = m.create('Ana', 0);
    expect(m.join('00000', 'Bia', '', undefined, 0)).toEqual({ ok: false, error: 'Sala não encontrada' });
    room.config.password = 'abc';
    expect(m.join(room.code, 'Bia', 'x', undefined, 0)).toEqual({ ok: false, error: 'Senha incorreta' });
    room.config.password = '';
    room.config.maxPlayers = 2;
    expect(m.join(room.code, 'Bia', '', undefined, 0).ok).toBe(true);
    expect(m.join(room.code, 'Caio', '', undefined, 0)).toEqual({ ok: false, error: 'Sala cheia' });
  });

  it('quem entra no meio da partida só joga a partir da próxima rodada', () => {
    const m = manager();
    const { room, player } = m.create('Ana', 0);
    game.startGame(room, player.id, 0, () => 0);
    const r = m.join(room.code, 'Bia', '', undefined, 1);
    expect(r.ok && r.player.playing).toBe(false);
  });

  it('reconexão com o mesmo id mantém lugar, pontos e respostas', () => {
    const m = manager();
    const { room, player } = m.create('Ana', 0);
    room.config.categories = ['Animal'];
    game.startGame(room, player.id, 0, () => 0);
    game.tick(room, 3_000, () => 0);
    game.setAnswers(room, player.id, { Animal: 'Abelha' });
    player.score = 30;

    m.disconnect(room.code, player.id, 5_000);
    expect(player.connected).toBe(false);

    const r = m.join(room.code, 'Outro nome', '', player.id, 20_000);
    expect(r.ok && r.player).toBe(player);
    expect(player.connected).toBe(true);
    expect(player.score).toBe(30);
    expect(room.current!.answers[player.id]).toEqual({ Animal: 'Abelha' });
  });

  it('após 60s desconectado o jogador sai e a coroa passa ao mais antigo; timers seguem', () => {
    const m = manager();
    const { room, player: ana } = m.create('Ana', 0);
    const bia = m.join(room.code, 'Bia', '', undefined, 1);
    const caio = m.join(room.code, 'Caio', '', undefined, 2);
    if (!bia.ok || !caio.ok) throw new Error('join falhou');
    game.startGame(room, ana.id, 0, () => 0);

    m.disconnect(room.code, ana.id, 1_000);
    expect(m.sweep(60_999)).toEqual([]);
    expect(m.sweep(61_000)).toEqual([room]);
    expect(room.players.map((p) => p.name)).toEqual(['Bia', 'Caio']);
    expect(room.hostId).toBe(bia.player.id);
    expect(game.tick(room, 61_000, () => 0)).toBe(true); // sorteio → respostas continua
  });

  it('dono que sai passa a coroa; último a sair apaga a sala', () => {
    const m = manager();
    const { room, player: ana } = m.create('Ana', 0);
    const bia = m.join(room.code, 'Bia', '', undefined, 1);
    if (!bia.ok) throw new Error('join falhou');
    m.leave(room.code, ana.id, 2);
    expect(room.hostId).toBe(bia.player.id);
    m.leave(room.code, bia.player.id, 3);
    expect(m.rooms.has(room.code)).toBe(false);
  });
});

describe('toView', () => {
  it('esconde a senha de quem não é dono e as respostas dos outros', () => {
    const m = manager();
    const { room, player: ana } = m.create('Ana', 0);
    const bia = m.join(room.code, 'Bia', '', undefined, 1);
    if (!bia.ok) throw new Error('join falhou');
    room.config.password = 'abc';
    room.config.categories = ['Animal'];
    game.startGame(room, ana.id, 0, () => 0);
    game.tick(room, 3_000, () => 0);
    game.setAnswers(room, ana.id, { Animal: 'Abelha' });

    const forBia = toView(room, bia.player.id, 4_000);
    expect(forBia.config.password).toBe('');
    expect(forBia.config.hasPassword).toBe(true);
    expect(forBia.myAnswers).toEqual({});
    expect(forBia.letter).toBe(room.current!.letter);
    expect(toView(room, ana.id, 4_000).config.password).toBe('abc');
    expect(toView(room, ana.id, 4_000).myAnswers).toEqual({ Animal: 'Abelha' });
  });

  it('na revisão mostra os grupos com veredito efetivo e "mine"', () => {
    const m = manager();
    const { room, player: ana } = m.create('Ana', 0);
    room.config.categories = ['Animal'];
    game.startGame(room, ana.id, 0, () => 0);
    game.tick(room, 3_000, () => 0);
    game.tick(room, 93_000, () => 0);
    game.applyJudgement(
      room,
      { Animal: [{ id: '0-0', canonical: 'Abelha', answers: { [ana.id]: 'abelha' }, valid: true, pending: false, reason: 'inseto', votes: [] }] },
      false,
      93_000,
    );
    const v = toView(room, ana.id, 93_000);
    expect(v.review).toMatchObject({ categoryIndex: 0, category: 'Animal' });
    expect(v.review!.groups[0]).toMatchObject({ effectiveValid: true, mine: true, eligibleVoters: 0 });
  });
});
