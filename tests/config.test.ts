import { describe, it, expect } from 'vitest';
import { sanitizeConfig } from '../server/game/config';
import { DEFAULT_CONFIG } from '../shared/defaults';

describe('sanitizeConfig', () => {
  it('limita rodadas e capacidade', () => {
    expect(sanitizeConfig(DEFAULT_CONFIG, { rounds: 99 }).rounds).toBe(15);
    expect(sanitizeConfig(DEFAULT_CONFIG, { rounds: 0 }).rounds).toBe(1);
    expect(sanitizeConfig(DEFAULT_CONFIG, { maxPlayers: 1 }).maxPlayers).toBe(2);
  });

  it('ignora valores inválidos de tempo e rigor', () => {
    const c = sanitizeConfig(DEFAULT_CONFIG, { time: 'eterno' as never, strictness: 'x' as never });
    expect(c.time).toBe('medium');
    expect(c.strictness).toBe('flexible');
  });

  it('limpa categorias, remove duplicadas (acento/caixa) e mantém ao menos 1', () => {
    const c = sanitizeConfig(DEFAULT_CONFIG, { categories: ['  Série ', 'serie', '', 'Tem na floresta'] });
    expect(c.categories).toEqual(['Série', 'Tem na floresta']);
    expect(sanitizeConfig(DEFAULT_CONFIG, { categories: [] }).categories).toEqual(DEFAULT_CONFIG.categories);
    expect(sanitizeConfig(DEFAULT_CONFIG, { categories: Array.from({ length: 20 }, (_, i) => `C${i}`) }).categories).toHaveLength(16);
  });

  it('letras: só A–Z, em ordem, ao menos 1', () => {
    expect(sanitizeConfig(DEFAULT_CONFIG, { letters: ['C', 'A', 'ç', '1'] }).letters).toEqual(['A', 'C']);
    expect(sanitizeConfig(DEFAULT_CONFIG, { letters: [] }).letters).toEqual(DEFAULT_CONFIG.letters);
  });

  it('senha é aparada e limitada', () => {
    expect(sanitizeConfig(DEFAULT_CONFIG, { password: '  abc ' }).password).toBe('abc');
  });
});
