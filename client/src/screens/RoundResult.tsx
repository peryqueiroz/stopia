import { DURATIONS } from '../../../shared/defaults';
import type { RoomView } from '../../../shared/types';
import { Avatar, TimerBar } from '../components';
import { useCountdown } from '../useCountdown';

export function RoundResult({ view, offset }: { view: RoomView; offset: number }) {
  const left = useCountdown(view.phaseEndsAt, offset);
  const rows = view.players
    .filter((p) => p.roundPoints !== null)
    .sort((a, b) => (b.roundPoints ?? 0) - (a.roundPoints ?? 0));

  return (
    <div className="round-result">
      <h2 className="stage-title">Fim da rodada {view.round}</h2>
      <ol className="ranking">
        {rows.map((p) => (
          <li key={p.id}>
            <Avatar name={p.name} color={p.color} />
            <span>{p.name}</span>
            <b>+{p.roundPoints}</b>
            <small>{p.score} pts</small>
          </li>
        ))}
      </ol>
      <TimerBar left={left} total={DURATIONS.roundResultMs} />
      <p className="hint">{view.round < view.config.rounds ? 'Próxima rodada em instantes…' : 'Ranking final em instantes…'}</p>
    </div>
  );
}
