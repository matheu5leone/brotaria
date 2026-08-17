-- Primeira planta da conta é REAPROVEITADA do acervo, para não gastar geração
-- de IA logo no cadastro (onde a taxa de abandono é maior e o custo é puro).
--
-- `cloned_from` aponta para a planta doadora: a cada evolução, a versão daquele
-- estágio (imagem + dna_snapshot) é copiada em vez de gerada. ON DELETE SET NULL
-- porque perder a doadora não pode quebrar a clone — ela só volta a gerar.
alter table public.plants
  add column if not exists cloned_from uuid references public.plants(id) on delete set null;

-- Gate de uma vez por conta. Coluna no profile (e não contagem de plantas)
-- para que apagar a planta e replantar não renove o benefício.
alter table public.profiles
  add column if not exists first_plant_cloned boolean not null default false;

-- Quem já tem planta não é conta nova: fecha o gate para não dar clone retroativo.
update public.profiles p
   set first_plant_cloned = true
 where exists (select 1 from public.plants pl where pl.user_id = p.id);

create index if not exists plants_cloned_from_idx on public.plants(cloned_from);
