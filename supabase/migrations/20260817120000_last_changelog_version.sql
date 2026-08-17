-- Nota de atualização: guarda a ÚLTIMA versão do jogo cujo changelog o jogador já leu.
-- Texto (semver) em vez de boolean como welcome_ack/tutorial_seen, porque a pergunta
-- aqui não é "já viu?" e sim "qual versão já viu?" — é o que permite abrir o modal de
-- novo a cada release sem precisar de uma coluna por update.
-- Nulo = nunca leu nenhuma nota (contas anteriores ao recurso).
alter table public.profiles
  add column if not exists last_changelog_version text;
