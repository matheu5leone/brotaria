-- Tutorial do pólen: modal que abre na 1ª vez que o jogador clica numa abelha,
-- explicando o fluxo abelha → pólen → Elixir Floral → reroll de sede.
-- Flag separada do tutorial de onboarding (tutorial_seen).
alter table public.profiles
  add column if not exists polen_tutorial_seen boolean not null default false;
