# Reestrutura do ciclo de vida das plantas (naming/UX) — design

Data: 2026-07-08

## Problema
Três conceitos sobrepostos: "Nível" (order_index+1, 2–14), "estágio" (porte) e
"fase" (1/2/3). As 3 fases de um porte são visualmente idênticas (imagem gerada só
na fase 1, reusada), então "Nova fase: Broto 2" não muda nada na tela. E o "+10 XP"
é falso (não há sistema de XP).

## Decisões (confirmadas)
- Usuário vê **5 estágios visíveis** com **barra que enche até a próxima mudança
  real** (esconde as fases 1/2/3).
- Nomes: **Semente → Broto → Muda → Jovem → Adulta**.
- **Remover** o número "Nível" — fica só o nome do estágio.
- Feedback nas fases internas (não confirmado explicitamente → adotado): toast
  discreto **"+N 🍃"**; a mudança grande **"🌿 Sua planta virou X!"** só no estágio visível.
- Mecânica interna (13 passos, regas, checkpoints de imagem, herbo, ranking) intacta.

## Mapeamento (interno → visível)
| order_index | estágio |
|---|---|
| 1 | Semente |
| 2–4 | Broto |
| 5–7 | Muda |
| 8–10 | Jovem |
| 11–13 | Adulta |

## Peça central
`config/lifecycle.ts`: `lifecycleFromOrder`, `lifecycleFromCode`,
`isVisibleStageChange(code)` (fase 1 do porte), e `getLifecycle(order, regas)` →
`{ name, progressWaters, totalWaters, progressPct, nextName, isFinal }` (barra por
porte: 9 regas até o próximo estágio; Semente = 3).

## Onde muda (só apresentação)
- `HexPot`: badge "Nível N" → nome do estágio.
- `PlantDetailModal`: "Nível N" → nome; barra por estágio ("X/9 regas até virar Muda");
  remove o chip "+10 XP"; mantém o herbo.
- `Garden` (toast): "🌿 Sua planta virou {nome}!" só quando `isVisibleStageChange`;
  senão toast discreto "+N 🍃".
- `PlantHistoryModal`: nome do estágio; remove "+10 XP".
- `PlantsGridModal`: nome do estágio.
- Ranking (`app/ranking/page.tsx`): nome do estágio via `stage_order`.
- `economy.ts`: remove `XP_PER_EVOLUTION` e usos.

## Fora de escopo
Regras de rega, 13 passos internos, geração de imagem por checkpoint, herbo, scoring.
