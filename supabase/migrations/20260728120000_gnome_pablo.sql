-- Pablo — gnomo de coleta passiva de água (/agua)
-- Estado do gnomo por usuário (singleton em profiles). Ver
-- docs/superpowers/specs/2026-07-28-pablo-gnomo-agua-passiva-design.md
alter table public.profiles
  add column if not exists gnome_unlocked       boolean     not null default false,
  add column if not exists gnome_awoken_at      timestamptz,
  add column if not exists gnome_bucket_pending boolean     not null default false;
