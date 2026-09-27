import { describe, it, expect, vi, beforeEach } from 'vitest';
import { judgeRound, manualJudgement, type JudgeGroup } from '../server/ai/judge';

function fake(result: JudgeGroup[][] | Error) {
  return {
    validate: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('judgeRound', () => {
  it('agrupa equivalentes, deduplica iguais e filtra letra errada sem chamar a IA para ela', async () => {
    const v = fake([[{ canonical: 'Game of Thrones', answers: [0, 1], valid: true, reason: 'Série da HBO' }]]);
    const answers = {
      p1: { Série: 'Game of Thrones' },
      p2: { Série: 'got' },
      p3: { Série: 'game of thrones ' },
      p4: { Série: 'Breaking Bad' },
      p5: { Série: '' },
    };
    const { judged, aiFailed } = await judgeRound('G', 'flexible', ['Série'], answers, v);

    expect(v.validate).toHaveBeenCalledWith({
      letter: 'G',
      strictness: 'flexible',
      categories: [{ category: 'Série', answers: ['Game of Thrones', 'got'] }],
    });
    expect(aiFailed).toBe(false);
    expect(judged['Série']).toEqual([
      {
        id: '0-0',
        canonical: 'Game of Thrones',
        answers: { p1: 'Game of Thrones', p3: 'game of thrones', p2: 'got' },
        valid: true,
        pending: false,
        reason: 'Série da HBO',
        votes: [],
      },
      {
        id: '0-1',
        canonical: 'Breaking Bad',
        answers: { p4: 'Breaking Bad' },
        valid: false,
        pending: false,
        reason: 'Não começa com a letra G',
        votes: [],
      },
    ]);
  });

  it('resposta acentuada conta pela letra base', async () => {
    const v = fake([[{ canonical: 'Ágata', answers: [0], valid: true, reason: 'nome' }]]);
    const { judged } = await judgeRound('A', 'strict', ['Nome'], { p1: { Nome: 'Ágata' } }, v);
    expect(v.validate).toHaveBeenCalledTimes(1);
    expect(judged['Nome'][0].valid).toBe(true);
  });

  it('IA fora do ar: tudo vira pendente e válido até o grupo votar', async () => {
    const v = fake(new Error('timeout'));
    const { judged, aiFailed } = await judgeRound('G', 'flexible', ['Animal'], { p1: { Animal: 'Gato' } }, v);
    expect(aiFailed).toBe(true);
    expect(judged['Animal']).toEqual([
      { id: '0-0', canonical: 'Gato', answers: { p1: 'Gato' }, valid: true, pending: true, reason: 'Sem veredito da IA: votem para invalidar', votes: [] },
    ]);
  });

  it('ignora índices inválidos/repetidos e trata respostas não cobertas como pendentes', async () => {
    const v = fake([[{ canonical: 'Gato', answers: [0, 0, 7], valid: true, reason: 'felino' }]]);
    const { judged } = await judgeRound('G', 'flexible', ['Animal'], { p1: { Animal: 'Gato' }, p2: { Animal: 'Girafa' } }, v);
    expect(judged['Animal'].map((g) => [g.canonical, Object.keys(g.answers), g.pending])).toEqual([
      ['Gato', ['p1'], false],
      ['Girafa', ['p2'], true],
    ]);
  });

  it('número errado de categorias na resposta da IA cai no modo manual', async () => {
    const v = fake([]);
    const { aiFailed, judged } = await judgeRound('G', 'flexible', ['Animal'], { p1: { Animal: 'Gato' } }, v);
    expect(aiFailed).toBe(true);
    expect(judged['Animal'][0].pending).toBe(true);
  });

  it('sem respostas não chama a IA', async () => {
    const v = fake([]);
    const { judged, aiFailed } = await judgeRound('G', 'flexible', ['Animal'], { p1: { Animal: '' } }, v);
    expect(v.validate).not.toHaveBeenCalled();
    expect(aiFailed).toBe(false);
    expect(judged).toEqual({ Animal: [] });
  });
});

describe('judgeRound com IA travada', () => {
  it('validador que nunca responde cai no modo manual após o limite rígido', async () => {
    const v = { validate: vi.fn(() => new Promise<JudgeGroup[][]>(() => {})) };
    const { judged, aiFailed } = await judgeRound('G', 'flexible', ['Animal'], { p1: { Animal: 'Gato' } }, v, 20);
    expect(aiFailed).toBe(true);
    expect(judged['Animal']).toEqual([
      { id: '0-0', canonical: 'Gato', answers: { p1: 'Gato' }, valid: true, pending: true, reason: 'Sem veredito da IA: votem para invalidar', votes: [] },
    ]);
  });

  it('manualJudgement monta o mesmo julgamento pendente do modo manual', async () => {
    const answers = { p1: { Animal: 'Gato', Cor: 'Azul' }, p2: { Animal: 'gato' } };
    const fromFailure = await judgeRound('G', 'flexible', ['Animal', 'Cor'], answers, fake(new Error('x')));
    expect(manualJudgement('G', ['Animal', 'Cor'], answers)).toEqual(fromFailure.judged);
  });
});
