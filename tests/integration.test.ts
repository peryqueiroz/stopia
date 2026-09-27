import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { attachGame } from '../server/io';
import type { JudgeInput } from '../server/ai/judge';
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

let cleanup: () => void = () => {};
afterEach(() => cleanup());

describe('partida completa via Socket.IO', () => {
  it('cria, entra, joga uma rodada com STOP, valida pela IA e chega ao ranking final', async () => {
    let clock = 0;
    const validator = {
      validate: vi.fn(async (input: JudgeInput) =>
        input.categories.map((c) =>
          c.answers.length ? [{ canonical: c.answers[0], answers: c.answers.map((_, i) => i), valid: true, reason: 'ok' }] : [],
        ),
      ),
    };
    const http: HttpServer = createServer();
    const game = attachGame(http, { validator, now: () => clock, rng: () => 0, tickMs: 10 });
    await new Promise<void>((r) => http.listen(0, r));
    const url = `http://localhost:${(http.address() as AddressInfo).port}`;
    const a: Client = connect(url, { transports: ['websocket'] });
    const b: Client = connect(url, { transports: ['websocket'] });
    cleanup = () => {
      a.close();
      b.close();
      game.stop();
      game.io.close();
    };

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
    clock = 3_000;
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
    clock += 15_000;
    const rr = await result;
    expect(rr.players.map((p) => [p.name, p.score, p.roundPoints])).toEqual([
      ['Ana', 5, 5],
      ['Bia', 5, 5],
    ]);

    const final = waitFor(a, (v) => v.phase === 'final');
    clock += 8_000;
    await final;
  });
});
