import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { attachGame, type GameServerOptions } from '../server/io';
import type { JudgeInput, Validator } from '../server/ai/judge';
import type { ClientToServer, RoomView, ServerToClient } from '../shared/types';

type Client = Socket<ServerToClient, ClientToServer>;

function waitFor(s: Client, pred: (v: RoomView) => boolean): Promise<RoomView> {
  return new Promise((resolve) => {
    const handler = (v: RoomView) => {
      if (pred(v)) {
        s.off('room:state', handler);
        resolve(v);
      }
    };
    s.on('room:state', handler);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Espera uma condição no estado do servidor (polling). */
async function until(pred: () => boolean, ms = 2_000): Promise<void> {
  const end = Date.now() + ms;
  while (!pred()) {
    if (Date.now() > end) throw new Error('condição não atingida a tempo');
    await sleep(10);
  }
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function okValidator() {
  return {
    validate: vi.fn(async (input: JudgeInput) =>
      input.categories.map((c) =>
        c.answers.length ? [{ canonical: c.answers[0], answers: c.answers.map((_, i) => i), valid: true, reason: 'ok' }] : [],
      ),
    ),
  };
}

/** rng que varia: com rng constante, a segunda sala sorteia o mesmo código para sempre. */
function cyclingRng() {
  let r = 0;
  return () => (r = (r + 0.137) % 1);
}

async function startServer(validator: Validator, extra: Partial<GameServerOptions> = {}) {
  const clock = { t: 0 };
  const http: HttpServer = createServer();
  const game = attachGame(http, { validator, now: () => clock.t, rng: () => 0, tickMs: 10, ...extra });
  await new Promise<void>((r) => http.listen(0, r));
  const url = `http://localhost:${(http.address() as AddressInfo).port}`;
  cleanups.push(() => {
    game.stop();
    game.io.close();
  });
  const client = (): Client => {
    const s: Client = connect(url, { transports: ['websocket'] });
    cleanups.push(() => s.close());
    return s;
  };
  return { game, clock, client };
}

describe('partida completa via Socket.IO', () => {
  it('cria, entra, joga uma rodada com STOP, valida pela IA e chega ao ranking final', async () => {
    const validator = okValidator();
    const { clock, client } = await startServer(validator);
    const a = client();
    const b = client();

    const created = await a.emitWithAck('room:create', { name: 'Ana' });
    if (!created.ok) throw new Error(created.error);
    const joined = await b.emitWithAck('room:join', { code: created.code, name: 'Bia', password: '' });
    expect(joined.ok).toBe(true);

    const configured = waitFor(a, (v) => v.config.categories.length === 1 && v.config.rounds === 1);
    a.emit('config:update', { categories: ['Animal'], letters: ['A'], rounds: 1 });
    await configured;

    const drawing = waitFor(b, (v) => v.phase === 'drawing');
    a.emit('game:start');
    expect((await drawing).letter).toBe('A');

    const answering = waitFor(a, (v) => v.phase === 'answering');
    clock.t = 3_000;
    await answering;

    a.emit('answers:update', { Animal: 'Abelha' });
    b.emit('answers:update', { Animal: 'abelha' });
    await sleep(50);
    const reviewA = waitFor(a, (v) => v.phase === 'review');
    const reviewB = waitFor(b, (v) => v.phase === 'review');
    a.emit('game:stop');
    const [va] = await Promise.all([reviewA, reviewB]);
    expect(va.stoppedBy).toBe(created.playerId);
    expect(va.review!.groups).toHaveLength(1);
    expect(Object.keys(va.review!.groups[0].answers)).toHaveLength(2);
    expect(validator.validate).toHaveBeenCalledTimes(1);

    const result = waitFor(a, (v) => v.phase === 'roundResult');
    clock.t += 15_000;
    const rr = await result;
    expect(rr.players.map((p) => [p.name, p.score, p.roundPoints])).toEqual([
      ['Ana', 5, 5],
      ['Bia', 5, 5],
    ]);

    const final = waitFor(a, (v) => v.phase === 'final');
    clock.t += 8_000;
    await final;
  });
});

describe('robustez do servidor', () => {
  it('emitir sem callback de ack não derruba o servidor', async () => {
    const { client } = await startServer(okValidator(), { rng: cyclingRng() });
    const raw = client() as unknown as { emit(ev: string, p: unknown): void };
    raw.emit('room:create', { name: 'Sem ack' });
    raw.emit('room:join', { code: '00000', name: 'Sem ack', password: '' });
    await sleep(50);
    const r = await client().timeout(1_000).emitWithAck('room:create', { name: 'Bia' });
    expect(r.ok).toBe(true);
  });

  it('socket que troca de sala larga o jogador antigo, que sai após a janela de reconexão', async () => {
    const { game, clock, client } = await startServer(okValidator(), { rng: cyclingRng() });
    const a = client();
    const first = await a.emitWithAck('room:create', { name: 'Ana' });
    const second = await a.emitWithAck('room:create', { name: 'Ana' });
    if (!first.ok || !second.ok) throw new Error('create falhou');
    expect(first.code).not.toBe(second.code);

    clock.t = 61_000;
    await until(() => !game.rooms.rooms.has(first.code));
    expect(game.rooms.rooms.get(second.code)?.players.map((p) => p.connected)).toEqual([true]);
  });
});
