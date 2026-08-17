-- Material que a obra rendeu mas NÃO coube na mochila.
--
-- O servidor precisa lembrar o que ficou devendo: sem isto, a tela de mochila
-- cheia teria que dizer ao servidor "me dê tal item" na hora de resolver — e
-- conceder item a pedido do cliente é entregar a economia. Guardado no próprio
-- canteiro, some quando é entregue.
alter table public.pots
  add column if not exists dig_overflow text[];
