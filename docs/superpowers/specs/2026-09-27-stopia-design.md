# StopIA — Spec de design

Data: 2026-09-27 · Status: aguardando revisão

## Contexto
Jogo de Stop online multiplayer, com o fluxo do stopots.com, para **jogar com amigos**.
Problema: em categorias criadas pelos jogadores (ex.: "Tem na floresta") os critérios de aceite
viram bagunça ("lua", "água", "dinossauro"...). Solução: **uma IA julga as respostas** de cada
categoria, com rigor configurável (flexível/rígido), e o grupo ainda pode contestar.

Na implementação da UI: skills `image-to-code` + `design-taste-frontend` com as 4 imagens de referência;
revisão com `web-design-guidelines`; `ponytail` para manter o código mínimo.

---

## 1. Decisões de produto
- Público: grupo de amigos; salas privadas por link/código; baixa escala.
- Entrada: apelido + link, sem cadastro; nada persistido entre partidas; avatar = iniciais + cor derivada do apelido.
- Nome: **StopIA**. Identidade visual própria (roxo/ciano/amarelo, hexágono central), sem marca/assets do Stopots.
- Veredito: IA sugere; grupo contesta por maioria.
- Pontuação: 10 (válida e única) / 5 (válida, mas equivalente à de outro jogador) / 0 (inválida ou vazia).
  Equivalência inclui erro de grafia, sigla e variações ("game of thrones" = "got" = "game of trones").
- v1: núcleo + efeitos sonoros. Fora da v1: figurinhas, galeria de avatares, animações elaboradas, contas, salas públicas.

## 2. Arquitetura
Um único pacote TypeScript (um `package.json`):
- `shared/` — tipos de estado e eventos Socket.IO (contrato cliente↔servidor).
- `server/` — Node + Socket.IO, **autoritativo** (relógio, fases, pontos). Em produção serve o `client/dist`.
  - `RoomManager` — criar/entrar (código 5 dígitos, link), máx. 10 jogadores, senha opcional, coroa (transferida ao mais antigo se o dono sair), limpeza após 30 min ociosa.
  - `Game` — máquina de estados **pura** (sem rede/IA): `(estado, ação, agora) → novo estado`.
  - `Validator` — chama a IA; interface injetável (fake nos testes).
  - `Scoring` — vereditos + contestações → pontos.
- `client/` — React + Vite; renderiza o estado recebido e emite ações.
Estado das salas em memória (queda do servidor perde partidas — aceitável).

## 3. Fluxo e regras
```
LOBBY → SORTEIO (~3s) → RESPOSTAS (timer) → VALIDANDO (IA) → REVISÃO (por categoria)
      → RESULTADO DA RODADA → … → RANKING FINAL → "Jogar de novo" → LOBBY
```
- Config da sala: rodadas (1–15, padrão 8), tempo (curto 60s / médio 90s / longo 120s), senha opcional,
  categorias (lista padrão + personalizadas; mín. 1, máx. 16), letras (padrão: todas exceto H J K N Q U W X Y Z),
  **rigor da IA: Flexível | Rígido**, capacidade máxima da sala (2–10, padrão 10).
- STOP (modo único na v1): só habilitado com todas as categorias preenchidas; fim do tempo = STOP automático; trava as respostas de todos imediatamente.
- Sorteio sem repetir letra na partida. Acentos normalizados (Á→A) na checagem de inicial.
- Quem entra no meio da partida joga a partir da próxima rodada, com 0 pontos. Partida pode iniciar com 1 jogador.
- Reconexão em até 60s via id do jogador guardado no navegador.
- Servidor ignora ações fora da fase e duplicadas; respostas limitadas a 40 caracteres.

## 4. Validação por IA
- **Modelo:** Claude Opus 5 (`claude-opus-5`) via `@anthropic-ai/sdk`, modelo em variável de ambiente. Saída estruturada (`output_config.format`, JSON schema) — sem parsing de texto livre. Tratar `stop_reason: "refusal"` como falha (cai no fallback).
- **Uma chamada por rodada**, após o STOP.
- **Pré-filtro determinístico** (sem IA): vazia ou inicial errada → 0.
- **Entrada:** letra, rigor, e por categoria a lista de respostas **anônimas** (sem nome do jogador), passadas como dados JSON; o prompt instrui a tratar respostas como dados, nunca como instruções (anti-injeção).
- **Saída por categoria:** grupos `{ canonica, respostas: [índices], valida, motivo }`.
- **Rigor:** Flexível aceita associação plausível ("violão" em "Tem no churrasco"); Rígido só pertencimento claro/típico.
- **Pontos:** grupo válido com 1 jogador = 10; com ≥2 jogadores = 5 cada; inválido = 0. Recalculado após contestações.
- **Falha/timeout (25s) ou recusa:** respostas ficam "pendente" e o grupo vota manualmente (como no Stopots). A rodada nunca trava.
- **Custo estimado:** ~US$ 0,80 por partida de 8 rodadas (12 categorias × 10 jogadores).

## 5. Revisão e contestação
- Uma categoria por vez (~15s cada; dono pode avançar).
- Cada grupo mostra respostas, forma canônica, ✅/❌ e motivo; botão **Contestar** com contador.
- Voto é por grupo; inverte o veredito se votos > metade dos jogadores conectados que **não** estão no grupo. Sem eleitores elegíveis → sem contestação.

## 6. Telas
1. Início (apelido; criar sala / entrar com código; link leva direto à sala).
2. Sala/Configuração (ref. imagem 2): jogadores à esquerda, config no centro com etiquetas de categorias, grade de letras, seletor de rigor; INICIAR só para o dono; compartilhar copia link.
3. Sorteio: hexágono com a letra, animação simples.
4. Preenchimento (ref. imagem 1): grade de categorias, barra de tempo, botão STOP!.
5. Validando: hexágono girando + "A IA está julgando…".
6. Revisão (ref. imagem 4).
7. Resultado da rodada: pontos da rodada + placar acumulado.
8. Ranking final: pódio top 3, lista, "Jogar de novo".
- Painel direito: **mural de eventos** (entrou, gritou STOP!, IA validou) no lugar das figurinhas.
- Mobile: jogadores viram faixa horizontal no topo; grade 1–2 colunas; STOP fixo no rodapé.
- Sons (arquivos curtos CC0): sorteio, tique nos últimos 5s, STOP, acerto/erro, fim de partida; mudo salvo no navegador.

## 7. Testes
- Vitest unitário: transições da máquina de estados, regras do STOP, timer com relógio falso, pontuação 10/5/0 com grupos, contestação por maioria, normalização de acentos.
- Validator com IA simulada: parsing do schema, fallback em timeout/erro/recusa.
- Integração: servidor real + 2 clientes Socket.IO jogando uma rodada com validator fake.
- Eval manual de casos difíceis com a IA real (floresta: lua/água/dinossauro; churrasco: violão flexível vs rígido; variações de Game of Thrones) — roda só sob pedido (custa centavos).
- E2E manual: 2 abas no navegador, incluindo viewport de celular.

## 8. Deploy
- Render (plano gratuito), um único serviço web; `ANTHROPIC_API_KEY` como segredo de ambiente.
- Ressalva: o plano gratuito dorme após 15 min sem uso (~1 min para acordar).

## Verificação (fim da implementação)
- `npm test` verde (unitários + integração).
- `npm run dev` e partida completa em 2 abas: config → sorteio → preenchimento → STOP → validação IA → contestação → resultado → ranking final.
- Eval de casos difíceis com a IA real, sob autorização do usuário.
