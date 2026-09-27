import { useEffect, useState } from 'react';
import { ALL_LETTERS, DEFAULT_CATEGORIES, LIMITS } from '../../../shared/defaults';
import type { RoomConfig, RoomView, TimeOption } from '../../../shared/types';
import { Icon } from '../components';
import { socket } from '../socket';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export function Lobby({ view }: { view: RoomView; offset: number }) {
  const isHost = view.me === view.hostId;
  const c = view.config;
  const update = (patch: Partial<RoomConfig>) => socket.emit('config:update', patch);
  const [newCategory, setNewCategory] = useState('');
  const [password, setPassword] = useState(c.password);
  useEffect(() => setPassword(c.password), [c.password]);

  const addCategory = () => {
    const name = newCategory.trim();
    if (name) update({ categories: [...c.categories, name] });
    setNewCategory('');
  };

  return (
    <div className="lobby">
      <h2 className="stage-title">Configurações</h2>
      <fieldset className="lobby-grid" disabled={!isHost}>
        <legend className="sr-only">Configurações da sala</legend>
        <div className="config-col">
          <label>
            <span className="field-label">
              <Icon name="rounds" />
              Rodadas
            </span>
            <select name="rounds" value={c.rounds} onChange={(e) => update({ rounds: Number(e.target.value) })}>
              {range(LIMITS.minRounds, LIMITS.maxRounds).map((n) => (
                <option key={n} value={n}>{n} rodadas</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">
              <Icon name="clock" />
              Tempo
            </span>
            <select name="time" value={c.time} onChange={(e) => update({ time: e.target.value as TimeOption })}>
              <option value="short">Curto (60s)</option>
              <option value="medium">Médio (90s)</option>
              <option value="long">Longo (120s)</option>
            </select>
          </label>
          <label>
            <span className="field-label">
              <Icon name="users" />
              Jogadores
            </span>
            <select name="maxPlayers" value={c.maxPlayers} onChange={(e) => update({ maxPlayers: Number(e.target.value) })}>
              {range(LIMITS.minPlayers, LIMITS.maxPlayers).map((n) => (
                <option key={n} value={n}>{n} jogadores</option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">
              <Icon name="lock" />
              Senha
            </span>
            <input
              name="roomPassword"
              autoComplete="off"
              spellCheck={false}
              value={isHost ? password : c.hasPassword ? '••••••' : ''}
              maxLength={LIMITS.maxPassword}
              placeholder="sem senha"
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => update({ password })}
            />
          </label>
          <div className="field">
            <span className="field-label">
              <Icon name="sparkle" />
              Juiz IA
            </span>
            <div className="segmented" role="radiogroup" aria-label="Rigor da IA">
              <button type="button" role="radio" aria-checked={c.strictness === 'flexible'} onClick={() => update({ strictness: 'flexible' })}>
                Flexível
              </button>
              <button type="button" role="radio" aria-checked={c.strictness === 'strict'} onClick={() => update({ strictness: 'strict' })}>
                Rígido
              </button>
            </div>
            <small className="field-help">
              {c.strictness === 'flexible'
                ? 'Aceita associações plausíveis (ex.: violão em “Tem no churrasco”).'
                : 'Só aceita o que pertence claramente à categoria.'}
            </small>
          </div>
        </div>

        <div className="config-col">
          <div className="field">
            <span className="field-label">
              <Icon name="list" />
              Categorias ({c.categories.length})
            </span>
            <div className="chips">
              {c.categories.map((cat) => (
                <span key={cat} className="chip">
                  {cat}
                  {isHost && c.categories.length > 1 && (
                    <button type="button" aria-label={`Remover ${cat}`} onClick={() => update({ categories: c.categories.filter((x) => x !== cat) })}>
                      <Icon name="x" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="add-row">
              <input
                value={newCategory}
                maxLength={LIMITS.maxCategoryLength}
                placeholder="Nova categoria (ex.: Tem na floresta)"
                aria-label="Nova categoria"
                name="newCategory"
                autoComplete="off"
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCategory();
                  }
                }}
              />
              <button type="button" className="btn" onClick={addCategory} disabled={c.categories.length >= LIMITS.maxCategories}>
                <Icon name="plus" />
                ADD
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => update({ categories: DEFAULT_CATEGORIES })}>
                <Icon name="rounds" />
                Restaurar
              </button>
            </div>
          </div>
          <div className="field">
            <span className="field-label">
              <Icon name="letters" />
              Letras ({c.letters.length})
            </span>
            <div className="letters" role="group" aria-label="Letras que podem ser sorteadas">
              {ALL_LETTERS.map((l) => {
                const on = c.letters.includes(l);
                return (
                  <button
                    type="button"
                    key={l}
                    className={`letter${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => update({ letters: on ? c.letters.filter((x) => x !== l) : [...c.letters, l] })}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </fieldset>
      {isHost ? (
        <button className="btn btn-primary big" onClick={() => socket.emit('game:start')}>
          INICIAR
        </button>
      ) : (
        <p className="hint">Aguardando o dono da sala iniciar…</p>
      )}
    </div>
  );
}
