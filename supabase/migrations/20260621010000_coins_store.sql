-- Mudança 10: economia de moedas + loja.
--
-- Introduz o saldo de "moedas" (créditos do jogo) por usuário e as funções
-- atômicas usadas pelas rotas de API para creditar e gastar moedas.
--
-- Fluxo da economia: R$ -> moedas -> produtos (sementes).
-- (Pagamento real via Stripe fica para o fim do projeto; hoje é mockado.)

-- 1) Saldo de moedas por usuário. Novos e antigos usuários começam em 0.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- 2) Credita moedas de forma atômica. Retorna o novo saldo.
CREATE OR REPLACE FUNCTION add_coins(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  UPDATE profiles
    SET coins = coins + p_amount
    WHERE id = p_user_id
    RETURNING coins INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  RETURN new_balance;
END;
$$;

-- 3) Gasta moedas de forma atômica (impede saldo negativo / double-spend).
--    Levanta INSUFFICIENT_COINS quando o saldo não cobre o valor.
CREATE OR REPLACE FUNCTION spend_coins(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  UPDATE profiles
    SET coins = coins - p_amount
    WHERE id = p_user_id AND coins >= p_amount
    RETURNING coins INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_COINS';
  END IF;

  RETURN new_balance;
END;
$$;
