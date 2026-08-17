<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ritual de release

Ao terminar uma feature que o jogador percebe, antes de commitar:

1. Adicione **um objeto novo no topo** de `src/config/changelog.json` — texto de
   jogador ("a pá agora tem 5 usos"), nunca de commit ("refactor do shovel durability").
2. Suba a `version` do `package.json` para bater com ele.
   - **MINOR** (`0.9.0` → `0.10.0`) — mecânica ou sistema novo. Abre o modal para todo mundo.
   - **PATCH** (`0.9.0` → `0.9.1`) — correção, balanceamento, polimento. Só acende a
     bolinha de não-lido no menu, sem interromper quem está jogando.
   - **MAJOR** fica reservado para o lançamento oficial.
3. Commite e dê push.

O primeiro objeto do `changelog.json` é a fonte da verdade da versão do jogo — o
`package.json` só espelha.
