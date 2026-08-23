-- Missão "presentear alguém": o crédito saiu do envio e passou para a ABERTURA
-- do presente pelo destinatário (ver /api/inventory/open-gift). O novo status
-- 'opened' é o cadeado de idempotência do crédito — não precisa de coluna nova,
-- a tabela gifts.status é text livre, sem CHECK.
--
-- Os presentes que já estão 'accepted' foram enviados sob a regra antiga e JÁ
-- pagaram a missão no envio. Marcá-los como 'opened' agora impede que paguem de
-- novo quando o destinatário abrir. Ninguém perde recompensa já ganha; só não
-- ganha duas vezes pelo mesmo presente.
update public.gifts
   set status = 'opened'
 where status = 'accepted';
