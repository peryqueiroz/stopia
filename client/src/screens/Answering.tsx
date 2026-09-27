import { useState } from 'react';
import { TIME_SECONDS } from '../../../shared/defaults';
import { MAX_ANSWER } from '../../../shared/text';
import type { RoomView } from '../../../shared/types';
import { TimerBar } from '../components';
import { socket } from '../socket';
import { useCountdown } from '../useCountdown';

export function Answering({ view, offset }: { view: RoomView; offset: number }) {
  const [answers, setAnswers] = useState<Record<string, string>>(view.myAnswers);
  const left = useCountdown(view.phaseEndsAt, offset);
  const me = view.players.find((p) => p.id === view.me);
  const categories = view.config.categories;
  const filled = categories.every((c) => (answers[c] ?? '').trim() !== '');

  const change = (category: string, value: string) => {
    const next = { ...answers, [category]: value };
    setAnswers(next);
    socket.emit('answers:update', next);
  };

  if (!me?.playing) return <p className="hint">Você entra na próxima rodada. Enquanto isso, assista!</p>;

  return (
    <div className="answering">
      <h2 className="stage-title">Preencha as categorias</h2>
      <div className="answer-grid">
        {categories.map((cat, i) => (
          <label key={cat} className={`answer-card${(answers[cat] ?? '').trim() ? ' filled' : ''}`}>
            <span>{cat}</span>
            <input
              value={answers[cat] ?? ''}
              maxLength={MAX_ANSWER}
              autoFocus={i === 0}
              autoComplete="off"
              onChange={(e) => change(cat, e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const inputs = e.currentTarget.closest('.answer-grid')?.querySelectorAll('input');
                (inputs?.[i + 1] as HTMLInputElement | undefined)?.focus();
              }}
            />
          </label>
        ))}
      </div>
      <TimerBar left={left} total={TIME_SECONDS[view.config.time] * 1000} />
      <button className="btn btn-stop big" disabled={!filled} onClick={() => socket.emit('game:stop')}>
        STOP!
      </button>
    </div>
  );
}
