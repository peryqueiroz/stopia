import type { RoomView } from '../../../shared/types';
import { Avatar } from '../components';
import { socket } from '../socket';

export function Final({ view }: { view: RoomView; offset: number }) {
  const sorted = [...view.players].sort((a, b) => b.score - a.score);
  const isHost = view.me === view.hostId;

  return (
    <div className="final">
      <h2 className="stage-title">Ranking final</h2>
      <div className="podium">
        {sorted.slice(0, 3).map((p, i) => (
          <div key={p.id} className={`step step-${i + 1}`}>
            <Avatar name={p.name} color={p.color} />
            <span>{p.name}</span>
            <b>{p.score} pts</b>
            <em>{i + 1}º</em>
          </div>
        ))}
      </div>
      {sorted.length > 3 && (
        <ol className="ranking" start={4}>
          {sorted.slice(3).map((p) => (
            <li key={p.id}>
              <Avatar name={p.name} color={p.color} />
              <span>{p.name}</span>
              <b>{p.score} pts</b>
            </li>
          ))}
        </ol>
      )}
      {isHost ? (
        <button className="btn btn-primary big" onClick={() => socket.emit('game:playAgain')}>
          Jogar de novo
        </button>
      ) : (
        <p className="hint">Aguardando o dono da sala…</p>
      )}
    </div>
  );
}
