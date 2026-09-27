#!/usr/bin/env node
/**
 * Build do destino APP (export estático para dentro do Capacitor).
 *
 *   npm run build:app
 *
 * Existe como script, e não como `BUILD_TARGET=app next build` no package.json,
 * por dois motivos:
 *
 *  1. Windows. `VAR=valor comando` não funciona no cmd nem no PowerShell, e o
 *     desenvolvimento deste jogo acontece no Windows.
 *  2. Este build roda AQUI, não na Vercel — então as variáveis de sistema da
 *     Vercel não existem, e sem uma URL explícita o app sairia com
 *     `http://localhost:3000` gravado como endereço da API. Um app que só
 *     funciona na máquina de quem compilou.
 */
import { spawnSync } from 'node:child_process';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://brotaria.online';

console.log(`\n  destino: app   API: ${SITE_URL}\n`);

const r = spawnSync('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, BUILD_TARGET: 'app', NEXT_PUBLIC_SITE_URL: SITE_URL },
});

process.exit(r.status ?? 1);
