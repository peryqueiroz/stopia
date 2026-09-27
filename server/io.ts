import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServer, ServerToClient } from '../shared/types';
import { judgeRound, manualJudgement, type Validator } from './ai/judge';
import * as game from './game/game';
import type { Room } from './room';
import { RoomManager } from './rooms';
import { toView } from './view';

interface SocketData {
  code?: string;
  playerId?: string;
}

export interface GameServerOptions {
  validator: Validator;
  now?: () => number;
  rng?: () => number;
  tickMs?: number;
  /** limite rígido do julgamento; padrão: AI_TIMEOUT_MS (ou 25 s) + 5 s */
  aiTimeoutMs?: number;
}

export function attachGame(httpServer: HttpServer, opts: GameServerOptions) {
  const now = opts.now ?? Date.now;
  const rng = opts.rng ?? Math.random;
  const io = new Server<ClientToServer, ServerToClient, {}, SocketData>(httpServer);
  const rooms = new RoomManager(rng);
  const judging = new Set<Room>();

  function broadcast(room: Room) {
    const t = now();
    for (const p of room.players) io.to(`p:${p.id}`).emit('room:state', toView(room, p.id, t));
  }

  function changed(room: Room) {
    room.lastActivity = now();
    if (room.phase === 'validating' && !judging.has(room)) startJudging(room);
    broadcast(room);
  }

  function startJudging(room: Room) {
    judging.add(room);
    const round = room.current!;
    const categories = room.config.categories;
    judgeRound(round.letter, room.config.strictness, categories, round.answers, opts.validator, opts.aiTimeoutMs)
      .then(({ judged, aiFailed }) => {
        if (room.current === round && game.applyJudgement(room, judged, aiFailed, now())) changed(room);
      })
      .catch((err) => {
        // `validating` nunca pode virar beco sem saída: cai no mesmo modo manual de uma falha da IA
        console.error('[io] julgamento falhou:', err);
        try {
          if (room.current !== round || room.phase !== 'validating') return;
          const judged = manualJudgement(round.letter, categories, round.answers);
          if (game.applyJudgement(room, judged, true, now())) changed(room);
        } catch (fallbackErr) {
          console.error('[io] modo manual falhou:', fallbackErr);
        }
      })
      .finally(() => judging.delete(room));
  }

  /** Nenhuma exceção de handler pode virar erro fatal (e derrubar todas as salas em memória). */
  function safe<A extends unknown[]>(event: string, fn: (...args: A) => void): (...args: A) => void {
    return (...args) => {
      try {
        fn(...args);
      } catch (err) {
        console.error(`[io] erro em ${event}:`, err);
      }
    };
  }

  /** O cliente pode emitir sem callback: responde no vazio em vez de lançar. */
  function replier<T>(ack: T): T {
    return (typeof ack === 'function' ? ack : () => {}) as T;
  }

  io.on('connection', (socket) => {
    /** Solta o jogador ligado a este socket: cai (conta a janela de reconexão) se nenhuma outra aba o segura. */
    function release(code: string, playerId: string) {
      socket.leave(`p:${playerId}`);
      if (io.sockets.adapter.rooms.get(`p:${playerId}`)?.size) return;
      rooms.disconnect(code, playerId, now());
      const room = rooms.rooms.get(code);
      if (room) changed(room);
    }

    function bind(room: Room, playerId: string) {
      const old = socket.data;
      if (old.code && old.playerId && (old.code !== room.code || old.playerId !== playerId)) {
        release(old.code, old.playerId);
      }
      socket.data.code = room.code;
      socket.data.playerId = playerId;
      socket.join(`p:${playerId}`);
    }

    function act(fn: (room: Room, playerId: string) => boolean, notify = true) {
      const { code, playerId } = socket.data;
      const room = code ? rooms.rooms.get(code) : undefined;
      if (!room || !playerId) return;
      if (fn(room, playerId) && notify) changed(room);
    }

    socket.on(
      'room:create',
      safe('room:create', (p, ack) => {
        const reply = replier(ack);
        const { room, player } = rooms.create(p?.name, now());
        bind(room, player.id);
        reply({ ok: true, code: room.code, playerId: player.id, secret: player.secret });
        changed(room);
      }),
    );

    socket.on(
      'room:join',
      safe('room:join', (p, ack) => {
        const reply = replier(ack);
        const secret = typeof p?.secret === 'string' ? p.secret : undefined;
        const r = rooms.join(String(p?.code ?? ''), p?.name, String(p?.password ?? ''), p?.playerId, now(), secret);
        if (!r.ok) return reply(r);
        bind(r.room, r.player.id);
        reply({ ok: true, code: r.room.code, playerId: r.player.id, secret: r.player.secret });
        changed(r.room);
      }),
    );

    socket.on('room:leave', safe('room:leave', () => {
      const { code, playerId } = socket.data;
      if (!code || !playerId) return;
      rooms.leave(code, playerId, now());
      socket.leave(`p:${playerId}`);
      socket.data = {};
      const room = rooms.rooms.get(code);
      if (room) changed(room);
    }));

    socket.on('config:update', safe('config:update', (patch) => act((room, pid) => game.updateConfig(room, pid, patch ?? {}))));
    socket.on('game:start', safe('game:start', () => act((room, pid) => game.startGame(room, pid, now(), rng))));
    socket.on(
      'answers:update',
      safe('answers:update', (answers) => act((room, pid) => game.setAnswers(room, pid, answers ?? {}), false)),
    );
    socket.on('game:stop', safe('game:stop', () => act((room, pid) => game.stop(room, pid, now()))));
    socket.on('review:vote', safe('review:vote', (p) => act((room, pid) => game.vote(room, pid, String(p?.groupId ?? '')))));
    socket.on('review:next', safe('review:next', () => act((room, pid) => game.nextCategory(room, pid, now()))));
    socket.on('game:playAgain', safe('game:playAgain', () => act((room, pid) => game.playAgain(room, pid))));

    socket.on(
      'disconnect',
      safe('disconnect', () => {
        const { code, playerId } = socket.data;
        if (code && playerId) release(code, playerId);
      }),
    );
  });

  const timer = setInterval(
    safe('tick', () => {
      const t = now();
      for (const room of rooms.rooms.values()) if (game.tick(room, t, rng)) changed(room);
      for (const room of rooms.sweep(t)) changed(room);
    }),
    opts.tickMs ?? 250,
  );

  return { io, rooms, stop: () => clearInterval(timer) };
}
