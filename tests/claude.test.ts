import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { ClaudeValidator } from '../server/ai/claude';
import type { JudgeInput } from '../server/ai/judge';

function fakeClient(response: unknown) {
  const parse = vi.fn().mockResolvedValue(response);
  return { client: { messages: { parse } } as unknown as Anthropic, parse };
}

const input: JudgeInput = {
  letter: 'G',
  strictness: 'flexible',
  categories: [{ category: 'Série', answers: ['game of thrones', 'got'] }],
};

const okResponse = {
  stop_reason: 'end_turn',
  parsed_output: {
    categories: [{ groups: [{ canonical: 'Game of Thrones', answers: [0, 1], valid: true, reason: 'Série da HBO' }] }],
  },
};

describe('ClaudeValidator', () => {
  it('envia letra, rigor e respostas anônimas numeradas; usa timeout sem retry', async () => {
    const { client, parse } = fakeClient(okResponse);
    const out = await new ClaudeValidator(client, 'claude-opus-5', 1000).validate(input);

    expect(out).toEqual([[{ canonical: 'Game of Thrones', answers: [0, 1], valid: true, reason: 'Série da HBO' }]]);
    const [body, options] = parse.mock.calls[0];
    expect(body.model).toBe('claude-opus-5');
    expect(body.output_config.effort).toBe('low');
    expect(JSON.parse(body.messages[0].content)).toEqual({
      letra: 'G',
      rigor: 'flexivel',
      categorias: [{ categoria: 'Série', respostas: [{ i: 0, texto: 'game of thrones' }, { i: 1, texto: 'got' }] }],
    });
    expect(options).toEqual({ timeout: 1000, maxRetries: 0 });
  });

  it('rigor rígido vai como "rigido"', async () => {
    const { client, parse } = fakeClient(okResponse);
    await new ClaudeValidator(client, 'claude-opus-5', 1000).validate({ ...input, strictness: 'strict' });
    expect(JSON.parse(parse.mock.calls[0][0].messages[0].content).rigor).toBe('rigido');
  });

  it('recusa da IA vira erro (o judge cai no modo manual)', async () => {
    const { client } = fakeClient({ stop_reason: 'refusal', parsed_output: null });
    await expect(new ClaudeValidator(client, 'claude-opus-5', 1000).validate(input)).rejects.toThrow();
  });

  it('número errado de categorias vira erro', async () => {
    const { client } = fakeClient({ stop_reason: 'end_turn', parsed_output: { categories: [] } });
    await expect(new ClaudeValidator(client, 'claude-opus-5', 1000).validate(input)).rejects.toThrow();
  });
});
