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
      <h1 className="logo">
        Stop<span>IA</span>
      </h1>
      <p className="tagline">O Stop em que a IA é o juiz.</p>
      <form className="card home-card" onSubmit={submit}>
        <label>
          Seu apelido
          <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>
        <label>
          Código da sala (deixe vazio para criar uma)
          <input
            value={code}
            inputMode="numeric"
            maxLength={5}
            placeholder="ex.: 19517"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>
        {code && (
          <label>
            Senha (se houver)
            <input value={password} maxLength={20} onChange={(e) => setPassword(e.target.value)} />
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
