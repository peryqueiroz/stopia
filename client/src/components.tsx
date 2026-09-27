import type { ReactNode } from 'react';
import type { RoomEvent, RoomView } from '../../shared/types';

export function Hex({ children, big = false, spinning = false }: { children: ReactNode; big?: boolean; spinning?: boolean }) {
  return (
    <div className={`hex${big ? ' hex-big' : ''}${spinning ? ' spin' : ''}`}>
      <span>{children}</span>
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
    <div className="timer" role="timer" aria-label={`${secs} segundos restantes`}>
      <span className="timer-icon" aria-hidden="true">⏱</span>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="timer-num">{secs}s</span>
    </div>
  );
}

export function PlayerList({ view }: { view: RoomView }) {
  const empty = Math.max(0, view.config.maxPlayers - view.players.length);
  return (
    <aside className="players card" aria-label="Jogadores">
      {view.players.map((p) => (
        <div key={p.id} className={`player${p.id === view.me ? ' me' : ''}${p.connected ? '' : ' offline'}`}>
          <Avatar name={p.name} color={p.color} />
          <div className="player-info">
            <span className="player-name">
              {p.name}
              {p.isHost && <span className="crown" title="Dono da sala"> 👑</span>}
            </span>
            <span className="player-score">
              ★ {p.score}
              {p.roundPoints !== null && <em> +{p.roundPoints}</em>}
            </span>
          </div>
          {!p.playing && view.phase !== 'lobby' && <span className="badge">próxima rodada</span>}
        </div>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <div key={`empty-${i}`} className="player empty">
          Disponível
        </div>
      ))}
    </aside>
  );
}

export function EventFeed({ events }: { events: RoomEvent[] }) {
  return (
    <aside className="feed card" aria-label="Mural">
      <h2>Mural</h2>
      <ul aria-live="polite">
        {[...events].reverse().map((e) => (
          <li key={e.id}>{e.text}</li>
        ))}
      </ul>
    </aside>
  );
}
