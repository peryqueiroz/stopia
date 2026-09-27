import { useState } from 'react';
import type { RoomView } from '../../shared/types';
import { EventFeed, Hex, PlayerList } from './components';
import { Answering } from './screens/Answering';
import { Drawing } from './screens/Drawing';
import { Final } from './screens/Final';
import { Lobby } from './screens/Lobby';
import { Review } from './screens/Review';
import { RoundResult } from './screens/RoundResult';
import { Validating } from './screens/Validating';
import { isMuted, setMuted, useSounds } from './sounds';

function Screen({ view, offset }: { view: RoomView; offset: number }) {
  switch (view.phase) {
    case 'lobby':
      return <Lobby view={view} offset={offset} />;
    case 'drawing':
      return <Drawing letter={view.letter ?? '?'} />;
    case 'answering':
      return <Answering key={view.round} view={view} offset={offset} />;
    case 'validating':
      return <Validating />;
    case 'review':
      return <Review view={view} offset={offset} />;
    case 'roundResult':
      return <RoundResult view={view} offset={offset} />;
    case 'final':
      return <Final view={view} offset={offset} />;
  }
}

export function Shell({ view, offset, onLeave }: { view: RoomView; offset: number; onLeave: () => void }) {
  useSounds(view, offset);
  const [muted, setMutedState] = useState(isMuted());
  const [copied, setCopied] = useState(false);
  const inGame = view.phase !== 'lobby' && view.phase !== 'final';

  const share = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/?sala=${view.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard bloqueado: o código continua visível no topo
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <h1 className="logo small">
          Stop<span>IA</span>
        </h1>
        <div className="round-pill">
          {inGame ? (
            <>
              RODADA <b>{view.round}/{view.config.rounds}</b>
            </>
          ) : (
            <>
              SALA <b>{view.code}</b>
            </>
          )}
        </div>
        <Hex>{inGame && view.letter ? view.letter : '⚙'}</Hex>
        <div className="icon-buttons">
          <button
            className="icon-btn"
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
            onClick={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button className="icon-btn" aria-label="Copiar link da sala" onClick={share}>
            {copied ? '✓' : '🔗'}
          </button>
        </div>
        <button className="btn btn-ghost leave" onClick={onLeave}>
          SAIR ✕
        </button>
      </header>
      <PlayerList view={view} />
      <section className="stage card">
        <Screen view={view} offset={offset} />
      </section>
      <EventFeed events={view.events} />
    </div>
  );
}
