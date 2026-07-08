/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Passos do tutorial (coach marks do painel do jardim)
 *
 *  Cada passo aponta um botão real via `target` (que vira data-tutorial no
 *  HexButton). `image` é a foto do item; `bodyDesktop` sobrescreve o texto no PC
 *  (onde a interação é clique em vez de arrastar).
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type TutorialTarget = 'menu' | 'backpack' | 'shovel' | 'water' | 'barrow' | 'trash';

export interface TutorialStep {
  target: TutorialTarget;
  title: string;
  body: string;
  /** Texto alternativo no desktop (opcional). */
  bodyDesktop?: string;
  /** Foto do item (webp em /imgs). O passo "menu" não tem foto. */
  image?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: 'menu',
    title: 'Menu de ferramentas',
    body: 'Toque aqui para abrir ou recolher suas ferramentas do jardim.',
  },
  {
    target: 'backpack',
    image: '/imgs/backpack.webp',
    title: 'Mochila',
    body: 'Guarda suas sementes e itens. Toque para abrir e ver o que você tem.',
  },
  {
    target: 'shovel',
    image: '/imgs/shovel.webp',
    title: 'Pá',
    body: 'Cava um canteiro para plantar. Arraste a pá até um espaço no gramado. Com 0 canteiros ela fica sempre liberada.',
    bodyDesktop: 'Cava um canteiro para plantar. Clique na pá e depois clique num espaço do gramado. Com 0 canteiros ela fica sempre liberada.',
  },
  {
    target: 'water',
    image: '/imgs/watering-can.webp',
    title: 'Regador',
    body: 'Rega suas plantas para elas crescerem. Arraste o regador até a planta. Cada rega gasta 1 água.',
  },
  {
    target: 'barrow',
    image: '/imgs/wheelbarrow.webp',
    title: 'Carrinho de mão',
    body: 'Muda uma planta de lugar. Arraste até a planta para recolhê-la e depois até um canteiro vazio.',
  },
  {
    target: 'trash',
    image: '/imgs/trash.webp',
    title: 'Lixeira',
    body: 'Remove uma planta ou um canteiro. Arraste a lixeira até o que você quer remover.',
  },
];
