import { DURATIONS } from '../../../shared/defaults';
import type { RoomView } from '../../../shared/types';
import { Icon, TimerBar } from '../components';
import { socket } from '../socket';
import { useCountdown } from '../useCountdown';

export function Review({ view, offset }: { view: RoomView; offset: number }) {
  const review = view.review!;
  const left = useCountdown(view.phaseEndsAt, offset);
  const names = Object.fromEntries(view.players.map((p) => [p.id, p.name]));
  const me = view.players.find((p) => p.id === view.me);
  const isHost = view.me === view.hostId;

  return (
    <div className="review">
      <h2 className="stage-title">{review.category}</h2>
      <p className="stage-sub">
        Valide as respostas {review.categoryIndex + 1}/{view.config.categories.length}
      </p>
      {review.groups.length === 0 && <p className="hint">Ninguém respondeu esta categoria.</p>}
      <ul className="groups">
        {review.groups.map((g) => {
          const voted = g.votes.includes(view.me);
          const canVote = !g.mine && !!me?.playing && !!me?.connected;
          return (
            <li key={g.id} className={`group ${g.effectiveValid ? 'valid' : 'invalid'}`}>
              <div className="group-head">
                <span className="verdict">
                  <Icon name={g.effectiveValid ? 'check' : 'x'} />
                  <span className="sr-only">{g.effectiveValid ? 'Válida:' : 'Inválida:'}</span>
                </span>
                <strong>{g.canonical}</strong>
                {g.pending && <span className="badge">manual</span>}
                {g.effectiveValid !== g.valid && <span className="badge badge-flip">invertido pelo grupo</span>}
              </div>
              <p className="reason">{g.reason}</p>
              <p className="who">
                {Object.entries(g.answers)
                  .map(([pid, text]) => `${names[pid] ?? '?'}: ${text}`)
                  .join(' · ')}
              </p>
              <button
                className={`btn btn-small${voted ? ' active' : ''}`}
                disabled={!canVote}
                aria-pressed={voted}
                onClick={() => socket.emit('review:vote', { groupId: g.id })}
              >
                Contestar {g.votes.length}/{g.eligibleVoters}
              </button>
            </li>
          );
        })}
      </ul>
      <TimerBar left={left} total={DURATIONS.reviewPerCategoryMs} />
      {isHost && (
        <button className="btn btn-primary" onClick={() => socket.emit('review:next')}>
          Próxima
          <Icon name="arrowRight" />
        </button>
      )}
    </div>
  );
}
