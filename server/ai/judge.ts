import type { Group, Strictness } from '../../shared/types';
import { normalize, startsWithLetter } from '../../shared/text';

export interface JudgeInput {
  letter: string;
  strictness: Strictness;
  categories: { category: string; answers: string[] }[];
}

export interface JudgeGroup {
  canonical: string;
  /** índices em `categories[i].answers` */
  answers: number[];
  valid: boolean;
  reason: string;
}

export interface Validator {
  /** Um array de grupos por categoria, na mesma ordem da entrada. */
  validate(input: JudgeInput): Promise<JudgeGroup[][]>;
}

interface Bucket {
  text: string;
  players: Record<string, string>;
}

const PENDING_REASON = 'Sem veredito da IA: votem para invalidar';

type Answers = Record<string, Record<string, string>>;
type Bucketed = { category: string; unique: Bucket[]; wrongLetter: Bucket[] }[];

/** Timeout da chamada à IA (AI_TIMEOUT_MS), 25 s se ausente ou inválido. */
export function aiTimeoutMs(): number {
  const t = Number(process.env.AI_TIMEOUT_MS);
  return Number.isFinite(t) && t > 0 ? t : 25_000;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`IA não respondeu em ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Julgamento sem a IA: tudo pendente (válido até o grupo votar), letra errada inválida. */
export function manualJudgement(letter: string, categories: string[], answers: Answers): Record<string, Group[]> {
  return assemble(letter, bucketize(letter, categories, answers), null);
}

/**
 * @param timeoutMs limite rígido do lado do servidor, independente do validador;
 *   estourou, vale o mesmo modo manual de uma falha da IA.
 */
export async function judgeRound(
  letter: string,
  strictness: Strictness,
  categories: string[],
  answers: Answers,
  validator: Validator,
  timeoutMs: number = aiTimeoutMs() + 5_000,
): Promise<{ judged: Record<string, Group[]>; aiFailed: boolean }> {
  const perCategory = bucketize(letter, categories, answers);

  const needsAi = perCategory.some((c) => c.unique.length > 0);
  let result: JudgeGroup[][] | null = null;
  if (needsAi) {
    try {
      result = await withTimeout(
        validator.validate({
          letter,
          strictness,
          categories: perCategory.map((c) => ({ category: c.category, answers: c.unique.map((b) => b.text) })),
        }),
        timeoutMs,
      );
      if (result.length !== perCategory.length) result = null;
    } catch (err) {
      console.warn('[judge] IA falhou:', err);
      result = null;
    }
  }

  return { judged: assemble(letter, perCategory, result), aiFailed: needsAi && result === null };
}

function bucketize(letter: string, categories: string[], answers: Answers): Bucketed {
  return categories.map((category) => {
    const buckets = new Map<string, Bucket>();
    const wrongLetter: Bucket[] = [];
    for (const [playerId, byCategory] of Object.entries(answers)) {
      const text = (byCategory[category] ?? '').trim();
      if (!text) continue;
      if (!startsWithLetter(text, letter)) {
        wrongLetter.push({ text, players: { [playerId]: text } });
        continue;
      }
      const key = normalize(text);
      const bucket = buckets.get(key) ?? { text, players: {} };
      bucket.players[playerId] = text;
      buckets.set(key, bucket);
    }
    return { category, unique: [...buckets.values()], wrongLetter };
  });
}

/** Monta os grupos a partir do veredito da IA; `result` null = modo manual (tudo pendente). */
function assemble(letter: string, perCategory: Bucketed, result: JudgeGroup[][] | null): Record<string, Group[]> {
  const judged: Record<string, Group[]> = {};
  perCategory.forEach((c, ci) => {
    const groups: Omit<Group, 'id'>[] = [];
    const covered = new Set<number>();

    for (const jg of result?.[ci] ?? []) {
      const members = [...new Set(jg.answers)].filter(
        (i) => Number.isInteger(i) && i >= 0 && i < c.unique.length && !covered.has(i),
      );
      if (members.length === 0) continue;
      members.forEach((i) => covered.add(i));
      groups.push({
        canonical: jg.canonical || c.unique[members[0]].text,
        answers: Object.assign({}, ...members.map((i) => c.unique[i].players)),
        valid: jg.valid,
        pending: false,
        reason: jg.reason,
        votes: [],
      });
    }

    c.unique.forEach((b, i) => {
      if (!covered.has(i)) {
        groups.push({ canonical: b.text, answers: b.players, valid: true, pending: true, reason: PENDING_REASON, votes: [] });
      }
    });

    for (const b of c.wrongLetter) {
      groups.push({
        canonical: b.text,
        answers: b.players,
        valid: false,
        pending: false,
        reason: `Não começa com a letra ${letter}`,
        votes: [],
      });
    }

    judged[c.category] = groups.map((g, gi) => ({ id: `${ci}-${gi}`, ...g }));
  });

  return judged;
}
