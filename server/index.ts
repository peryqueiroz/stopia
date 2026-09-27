import express from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { ClaudeValidator } from './ai/claude';
import type { Validator } from './ai/judge';
import { attachGame } from './io';

try {
  process.loadEnvFile();
} catch {
  // sem .env: usa as variáveis do ambiente (produção)
}

const app = express();
const dist = fileURLToPath(new URL('../dist', import.meta.url));
if (existsSync(dist)) app.use(express.static(dist));

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
if (!hasKey) console.warn('[stopia] ANTHROPIC_API_KEY ausente: toda validação será manual.');
const validator: Validator = hasKey
  ? new ClaudeValidator()
  : {
      validate: async () => {
        throw new Error('ANTHROPIC_API_KEY não configurada');
      },
    };

const httpServer = createServer(app);
attachGame(httpServer, { validator });

const port = Number(process.env.PORT) || 3000;
httpServer.listen(port, () => console.log(`[stopia] http://localhost:${port}`));
