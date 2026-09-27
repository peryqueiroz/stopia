# StopIA

Stop (adedonha) online para jogar com amigos, em que a IA (Claude) julga as respostas.

## Rodar localmente

1. Node 22 ou mais novo.
2. `npm install`
3. Copie `.env.example` para `.env` e preencha `ANTHROPIC_API_KEY` (sem a chave, a validação vira votação manual).
4. `npm run dev` e abra http://localhost:5173

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor (porta 3000) + front com recarga automática (porta 5173) |
| `npm test` | testes (Vitest) |
| `npm run typecheck` | checagem de tipos |
| `npm run build && npm start` | build de produção servido em http://localhost:3000 |
| `npm run eval` | casos difíceis contra a IA real (gasta alguns centavos de API) |

## Publicar no Render (plano gratuito)

1. Suba o repositório para o GitHub.
2. No Render: **New → Blueprint** e escolha o repositório (usa o `render.yaml`).
3. Preencha o segredo `ANTHROPIC_API_KEY` quando o Render pedir.
4. Compartilhe o link com os amigos: `https://<seu-app>.onrender.com/?sala=<código>`.

No plano gratuito o serviço dorme após 15 minutos sem uso; o primeiro acesso depois disso leva cerca de 1 minuto.

## Variáveis de ambiente

| Variável | Padrão | Uso |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | chave da API da Anthropic |
| `AI_MODEL` | `claude-opus-5` | modelo que julga as respostas |
| `AI_TIMEOUT_MS` | `25000` | tempo máximo de espera pela IA antes da votação manual |
| `PORT` | `3000` | porta do servidor |
