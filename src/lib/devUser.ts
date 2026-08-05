/**
 * TEMPORÁRIO — conta autorizada a usar os atalhos de desenvolvimento (forçar
 * eventos, estornar compras) para testar features sem esperar cooldown.
 *
 * Vive num lugar só para não espalhar o UUID pelo código. Os atalhos são
 * validados NO SERVIDOR contra este id — não basta esconder o botão.
 *
 * REMOVER (junto das rotas `dev-*` e dos botões) quando não for mais preciso.
 */
export const DEV_USER_ID = '1d2695fc-4787-4917-a6ca-9392e5869165'; // @lele

export const isDevUser = (userId: string | undefined | null): boolean =>
  !!userId && userId === DEV_USER_ID;
