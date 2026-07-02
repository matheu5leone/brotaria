-- Realtime APENAS para presentes: o destinatário vê o presente chegar ao vivo,
-- sem esperar o polling. Aplicada em produção via MCP em 2026-07-02.
--
-- Segurança: postgres_changes respeita RLS — a policy gifts_visible
-- (sender ou recipient) garante que cada usuário só recebe eventos dos
-- presentes que lhe dizem respeito.
alter publication supabase_realtime add table public.gifts;

-- Bugfix descoberto no teste e2e: gifts.item_id era NOT NULL (legado), mas a
-- rota /api/gifts/send nunca o preenche — TODO envio de presente falhava na
-- inserção. A coluna não é lida em lugar nenhum do código; relaxada.
alter table public.gifts alter column item_id drop not null;
