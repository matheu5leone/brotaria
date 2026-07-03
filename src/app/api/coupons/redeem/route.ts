import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/getAuthUser';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getCoupon } from '@/config/coupons';
import { getCoinPackage } from '@/config/economy';

/**
 * Resgate de cupom de campanha (early access).
 *
 * Concede o pacote de moedas do cupom DE GRAÇA, uma única vez por conta, com a
 * regra de 1 cupom por campanha. Não passa pelo Stripe (R$0). A atomicidade e
 * as regras de unicidade ficam na RPC redeem_coupon_tx (constraints no banco).
 */
export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let code: unknown;
  try {
    ({ code } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Código do cupom é obrigatório.' }, { status: 400 });
  }

  const coupon = getCoupon(code);
  if (!coupon) {
    return NextResponse.json({ error: 'Cupom inválido.' }, { status: 404 });
  }

  const pkg = getCoinPackage(coupon.packageId);
  if (!pkg) {
    console.error(`[Coupons] Cupom ${coupon.code} aponta pra pacote inexistente: ${coupon.packageId}`);
    return NextResponse.json({ error: 'Configuração do cupom inválida.' }, { status: 500 });
  }

  const { data: newBalance, error } = await supabaseAdmin.rpc('redeem_coupon_tx', {
    p_user_id: user.id,
    p_code: coupon.code,
    p_campaign: coupon.campaign,
    p_coins: pkg.coins,
  });

  if (error) {
    if (error.message.includes('ALREADY_REDEEMED')) {
      return NextResponse.json(
        { error: 'Você já resgatou um cupom desta campanha.', code: 'ALREADY_REDEEMED' },
        { status: 409 },
      );
    }
    console.error('[Coupons] Falha ao resgatar cupom:', error);
    return NextResponse.json({ error: 'Falha ao resgatar o cupom.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    coins: newBalance,
    granted: pkg.coins,
    package: pkg.label,
  });
}
