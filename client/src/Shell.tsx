import { useState } from 'react';
import type { RoomView } from '../../shared/types';
import { EventFeed, Hex, Icon, PlayerList } from './components';
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
      <a className="skip-link" href="#palco">
        Pular para o jogo
      </a>
      <header className="topbar">
        <h1 className="logo small" translate="no">
          Stop<span>IA</span>
        </h1>
        <div className="control-bar">
          <div className="round-pill">
            {inGame ? (
              <>
                RODADA <b>{view.round}/{view.config.rounds}</b>
              </>
            ) : (
              <>
                SALA <b translate="no">{view.code}</b>
              </>
            )}
          </div>
          <Hex>
            {inGame && view.letter ? (
              view.letter
            ) : (
              <>
                <Icon name="gear" />
                <span className="sr-only">Configurações</span>
              </>
            )}
          </Hex>
          <div className="icon-buttons">
            <button
              type="button"
              className="icon-btn"
              aria-label={muted ? 'Ativar som' : 'Silenciar'}
              onClick={() => {
                setMuted(!muted);
                setMutedState(!muted);
              }}
            >
              <Icon name={muted ? 'mute' : 'volume'} />
            </button>
            <button type="button" className="icon-btn" aria-label="Copiar link da sala" onClick={share}>
              <Icon name={copied ? 'check' : 'link'} />
            </button>
            <span className="sr-only" role="status">
              {copied ? 'Link da sala copiado' : ''}
            </span>
          </div>
        </div>
        <button type="button" className="btn leave" onClick={onLeave}>
          SAIR
          <Icon name="x" />
        </button>
      </header>
      <PlayerList view={view} />
      <main id="palco" className="stage card" tabIndex={-1}>
        <Screen view={view} offset={offset} />
      </main>
      <EventFeed events={view.events} />
    </div>
  );
}
