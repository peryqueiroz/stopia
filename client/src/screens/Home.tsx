import { useState, type FormEvent } from 'react';
import { loadName, saveName } from '../session';
import { unlockAudio } from '../sounds';

const initialCode = new URLSearchParams(location.search).get('sala') ?? '';

export function Home({
  error,
  onCreate,
  onJoin,
}: {
  error: string;
  onCreate: (name: string) => Promise<void>;
  onJoin: (code: string, name: string, password: string) => Promise<void>;
}) {
  const [name, setName] = useState(loadName());
  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    saveName(n);
    unlockAudio();
    setBusy(true);
    await (code ? onJoin(code, n, password) : onCreate(n));
    setBusy(false);
  };

  return (
    <main className="home">
      <h1 className="logo" translate="no">
        Stop<span>IA</span>
      </h1>
      <p className="tagline">O Stop em que a IA é o juiz.</p>
      <form className="card home-card" onSubmit={submit}>
        <label>
          <span className="field-label">Seu apelido</span>
          <input
            name="nickname"
            value={name}
            maxLength={16}
            autoComplete="nickname"
            spellCheck={false}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
        </label>
        <label>
          <span className="field-label">
            Código da sala <small className="field-help">(deixe vazio para criar uma)</small>
          </span>
          <input
            name="roomCode"
            value={code}
            inputMode="numeric"
            maxLength={5}
            placeholder="ex.: 19517"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        {code && (
          <label>
            <span className="field-label">
              Senha <small className="field-help">(se houver)</small>
            </span>
            <input
              name="roomPassword"
              value={password}
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary big" disabled={busy}>
          {code ? 'Entrar na sala' : 'Criar sala'}
        </button>
      </form>
    </main>
  );
}
