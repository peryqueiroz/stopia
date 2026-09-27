export const MAX_ANSWER = 40;

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function startsWithLetter(answer: string, letter: string): boolean {
  const n = normalize(answer);
  return n.length > 0 && n[0] === normalize(letter);
}

export function cleanAnswer(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER);
}
