-- Remove colunas órfãs do modelo antigo de água (contador diário).
--
-- Contexto: a água deixou de ser um contador diário e virou SALDO estocável
-- (profiles.water_balance + water_last_collected_at), implementado em
-- src/services/waterService.ts. Estas duas colunas ficaram para trás.
--
-- Verificado antes do DROP: nenhuma referência em src/, em funções/RPC do
-- banco (pg_proc) ou em views (pg_views). Restavam apenas valores residuais
-- em 4 de 47 perfis, sem leitura nem escrita.
alter table public.profiles
  drop column if exists daily_waters_used,
  drop column if exists water_reset_date;
