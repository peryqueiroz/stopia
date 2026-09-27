import type { ReactNode } from 'react';
import type { RoomEvent, RoomView } from '../../shared/types';

/* Ícones em SVG inline (traço 2.25, cantos arredondados). Sempre decorativos:
   quem usa um ícone sozinho num botão dá o rótulo acessível ao botão. */
const ICONS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  volume: (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" />
      <path d="M15.5 9a4 4 0 010 6M18.2 6.5a7.6 7.6 0 010 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1.1 1.1" />
      <path d="M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1.1-1.1" />
    </>
  ),
  crown: <path d="M4 8.5l4.2 3.8L12 6l3.8 6.3L20 8.5 18.3 18H5.7z" fill="currentColor" />,
  star: (
    <path
      d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z"
      fill="currentColor"
    />
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6.5" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0113 0M16 4.6a3.5 3.5 0 010 6.8M18 14.2a6.5 6.5 0 013.5 5.8" />
    </>
  ),
  rounds: (
    <>
      <path d="M19.5 11A7.5 7.5 0 006 7.2L4.5 8.7M4.5 4.5v4.2h4.2" />
      <path d="M4.5 13A7.5 7.5 0 0018 16.8l1.5-1.5M19.5 19.5v-4.2h-4.2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </>
  ),
  sparkle: (
    <>
      <path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z" fill="currentColor" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor" />
    </>
  ),
  list: <path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />,
  letters: <path d="M3.5 19l4.5-13 4.5 13M5.2 14.5h5.6M15 11.5h5.5L15 19h5.5" />,
  alert: <path d="M12 5.5v8.5M12 18.5h.01" />,
  chat: <path d="M5 5.5h14a1.5 1.5 0 011.5 1.5v8.5a1.5 1.5 0 01-1.5 1.5h-7l-4.5 3.5V17H5a1.5 1.5 0 01-1.5-1.5V7A1.5 1.5 0 015 5.5z" />,
  trophy: (
    <>
      <path d="M7.5 4h9v5a4.5 4.5 0 01-9 0z" />
      <path d="M7.5 6H4.5a3 3 0 003 4M16.5 6h3a3 3 0 01-3 4M12 13.5V17M8.5 20h7M9.5 17h5" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

export function Hex({ children, big = false, spinning = false }: { children: ReactNode; big?: boolean; spinning?: boolean }) {
  return (
    <div className={`hex${big ? ' hex-big' : ''}${spinning ? ' spin' : ''}`}>
      <span className="hex-ring">
        <span className="hex-core">
          <span className="hex-content">{children}</span>
        </span>
      </span>
    </div>
  );
}

export function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="avatar" style={{ background: color }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function TimerBar({ left, total }: { left: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (left / total) * 100) : 0;
  const secs = Math.ceil(left / 1000);
  return (
    <div className={`timer${secs <= 10 ? ' timer-low' : ''}`} role="timer" aria-label={`${secs} segundos restantes`}>
      <span className="timer-icon">
        <Icon name="clock" />
      </span>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="timer-num" aria-hidden="true">
        {secs}s
      </span>
    </div>
  );
}

export function PlayerList({ view }: { view: RoomView }) {
  const empty = Math.max(0, view.config.maxPlayers - view.players.length);
  return (
    <aside className="players card" aria-label="Jogadores">
      <h2 className="panel-title">
        <Icon name="users" />
        Jogadores
        <b>
          {view.players.length}/{view.config.maxPlayers}
        </b>
      </h2>
      <ul className="player-list">
        {view.players.map((p) => (
          <li key={p.id} className={`player${p.id === view.me ? ' me' : ''}${p.connected ? '' : ' offline'}`}>
            <Avatar name={p.name} color={p.color} />
            <div className="player-info">
              <span className="player-name" translate="no">
                {p.name}
                {p.id === view.me && <span className="sr-only"> (você)</span>}
                {!p.connected && <span className="sr-only"> (desconectado)</span>}
              </span>
              <span className="player-score">
                <span className="score-pill">
                  <Icon name="star" />
                  <span className="sr-only">Pontos: </span>
                  {p.score}
                </span>
                {p.roundPoints !== null && <em>+{p.roundPoints}</em>}
              </span>
            </div>
            {p.isHost && (
              <span className="crown" title="Dono da sala">
                <Icon name="crown" />
                <span className="sr-only">Dono da sala</span>
              </span>
            )}
            {!p.playing && view.phase !== 'lobby' && <span className="badge">próxima rodada</span>}
          </li>
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <li key={`empty-${i}`} className="player empty">
            <span className="avatar avatar-empty" aria-hidden="true" />
            Disponível
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function EventFeed({ events }: { events: RoomEvent[] }) {
  return (
    <aside className="feed card" aria-label="Mural">
      <h2 className="panel-title">
        <Icon name="chat" />
        Mural
      </h2>
      <ul aria-live="polite" aria-relevant="additions">
        {[...events].reverse().map((e) => (
          <li key={e.id}>{e.text}</li>
        ))}
      </ul>
    </aside>
  );
}
