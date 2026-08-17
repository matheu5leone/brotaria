-- ═══════════════════════════════════════════════════════════════════════════
-- Conclusão manual da obra.
--
-- A obra deixa de virar canteiro sozinha: quando o tempo vence, o jogador
-- precisa tocar em "Concluir". É NESSE momento que a terra revela o que tinha
-- dentro (minhoca / terra molhada) — assim a recompensa acontece com o jogador
-- olhando, em vez de cair silenciosamente na mochila enquanto ele estava fora.
--
--   dig_claimed_at null + obra vencida  → estado 'done' (espera o Concluir)
--   dig_claimed_at preenchido           → estado 'ready' (pode plantar)
--
-- Como o sorteio saiu do ato de cavar para a conclusão, a precisão do minigame
-- precisa ser guardada no canteiro para ser usada lá na frente.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.pots
  add column if not exists dig_claimed_at timestamptz,
  add column if not exists dig_accuracy   real;

alter table public.pots drop constraint if exists pots_dig_accuracy_check;
alter table public.pots add constraint pots_dig_accuracy_check
  check (dig_accuracy is null or (dig_accuracy >= 0 and dig_accuracy <= 1));

-- Canteiros cuja obra JÁ tinha vencido nascem concluídos: eles já eram
-- plantáveis antes desta migração, e regredir para "precisa concluir" seria uma
-- mudança de estado nas costas de quem já está jogando.
-- Obras ainda em andamento seguem a regra nova quando terminarem.
update public.pots
   set dig_claimed_at = now()
 where dig_claimed_at is null
   and digging_started_at is not null
   and digging_started_at + make_interval(secs => coalesce(dig_duration_ms, 60000) / 1000.0) <= now();
