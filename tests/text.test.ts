import { describe, it, expect } from 'vitest';
import { normalize, startsWithLetter, cleanAnswer } from '../shared/text';

describe('normalize', () => {
  it('remove acentos, caixa e espaços extras', () => {
    expect(normalize('  Ágata   Christie ')).toBe('agata christie');
    expect(normalize('Çebola')).toBe('cebola');
  });
});

describe('startsWithLetter', () => {
  it('aceita inicial acentuada como a letra base', () => {
    expect(startsWithLetter('Ágata', 'A')).toBe(true);
    expect(startsWithLetter('  élefante', 'E')).toBe(true);
  });
  it('rejeita vazio e inicial errada', () => {
    expect(startsWithLetter('   ', 'A')).toBe(false);
    expect(startsWithLetter('Banana', 'A')).toBe(false);
  });
});

describe('cleanAnswer', () => {
  it('colapsa espaços e corta em 40 caracteres', () => {
    expect(cleanAnswer('  Ágata   Christie ')).toBe('Ágata Christie');
    expect(cleanAnswer('x'.repeat(50))).toHaveLength(40);
  });
});
