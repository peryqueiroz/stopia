export type Phase = 'lobby' | 'drawing' | 'answering' | 'validating' | 'review' | 'roundResult' | 'final';
export type TimeOption = 'short' | 'medium' | 'long';
export type Strictness = 'flexible' | 'strict';

export interface RoomConfig {
  rounds: number;
  time: TimeOption;
  categories: string[];
  letters: string[];
  strictness: Strictness;
  maxPlayers: number;
  password: string;
}

/** Respostas equivalentes de uma categoria, julgadas juntas. */
export interface Group {
  id: string;
  canonical: string;
  /** playerId -> texto digitado */
  answers: Record<string, string>;
  valid: boolean;
  /** true quando a IA não deu veredito (validação manual) */
  pending: boolean;
  reason: string;
  /** ids de quem contestou */
  votes: string[];
}

export interface GroupView extends Group {
  effectiveValid: boolean;
  eligibleVoters: number;
  mine: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  color: string;
  score: number;
  connected: boolean;
  playing: boolean;
  isHost: boolean;
  roundPoints: number | null;
}

export interface RoomEvent {
  id: number;
  text: string;
}

export interface RoomView {
  code: string;
  me: string;
  hostId: string;
  phase: Phase;
  /** password vem vazio para quem não é o dono */
  config: RoomConfig & { hasPassword: boolean };
  players: PublicPlayer[];
  round: number;
  letter: string | null;
  phaseEndsAt: number | null;
  serverNow: number;
  myAnswers: Record<string, string>;
  stoppedBy: string | null;
  review: { categoryIndex: number; category: string; groups: GroupView[] } | null;
  events: RoomEvent[];
}

/** `secret` é a credencial de reconexão: só vai para o próprio jogador, nunca no RoomView. */
export interface Joined {
  code: string;
  playerId: string;
  secret: string;
}

export type Ack<T> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface ClientToServer {
  'room:create': (p: { name: string }, ack: Ack<Joined>) => void;
  /** playerId + secret reconectam ao mesmo lugar; sem o segredo certo é uma entrada nova */
  'room:join': (
    p: { code: string; name: string; password: string; playerId?: string; secret?: string },
    ack: Ack<Joined>,
  ) => void;
  'room:leave': () => void;
  'config:update': (patch: Partial<RoomConfig>) => void;
  'game:start': () => void;
  'answers:update': (answers: Record<string, string>) => void;
  'game:stop': () => void;
  'review:vote': (p: { groupId: string }) => void;
  'review:next': () => void;
  'game:playAgain': () => void;
}

export interface ServerToClient {
  'room:state': (view: RoomView) => void;
}
