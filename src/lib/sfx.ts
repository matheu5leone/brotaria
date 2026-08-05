/**
 * Camada de sonoplastia — PONTO DE CONEXÃO, ainda sem áudio.
 *
 * O jogo não tem áudio hoje. Em vez de deixar a animação sem lugar para o som
 * (e ter que refatorá-la depois), os componentes já chamam `playSfx('...')`.
 * Quando a sonoplastia entrar, basta implementar AQUI — nenhum componente muda.
 *
 * Ao implementar, lembrar de:
 *  - respeitar `prefers-reduced-motion` / uma preferência de áudio do jogador;
 *  - só tocar após um gesto do usuário (política de autoplay dos navegadores);
 *  - pré-carregar os arquivos usados em animação (ex.: o rufar de tambores).
 */
export type SfxName = 'drumroll' | 'reveal' | 'bee' | 'polen';

export function playSfx(_name: SfxName): void {
  // no-op até existir a camada de áudio.
}
