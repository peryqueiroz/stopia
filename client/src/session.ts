export interface Session {
  code: string;
  playerId: string;
  /** credencial de reconexão devolvida pelo servidor */
  secret: string;
  name: string;
}

const SESSION_KEY = 'stopia:session';
const NAME_KEY = 'stopia:name';

export function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
}

export function saveSession(s: Session | null): void {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // armazenamento indisponível: segue sem reconexão automática
  }
}

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // ignora
  }
}
