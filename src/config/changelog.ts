/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  BROTARIA — Nota de atualização (changelog do jogo)
 *
 *  Os dados vivem em `changelog.json` (array ordenado do mais novo para o mais
 *  antigo). A cada release, adicione UM objeto novo no topo do arquivo e suba a
 *  versão do `package.json` para bater com ele — o primeiro item é a fonte da
 *  verdade da versão do jogo.
 *
 *  Texto de jogador, não de commit: "a pá agora tem 5 usos", nunca "refactor do
 *  shovel durability".
 *
 *  Regra do modal automático: só release de MINOR/MAJOR interrompe o jogador.
 *  PATCH (correção) apenas acende a bolinha de não-lido no menu.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import raw from './changelog.json';

/** Categoria da linha — define a cor do chip no modal. */
export type ChangelogNoteType = 'novo' | 'melhoria' | 'balanceamento' | 'correcao';

export interface ChangelogNote {
  type: ChangelogNoteType;
  text: string;
}

export interface ChangelogEntry {
  /** Semver, ex.: "0.9.0". */
  version: string;
  /** ISO (YYYY-MM-DD). */
  date: string;
  /** Chamada curta do release. */
  title: string;
  /** Foto de destaque (webp em /public/imgs). Opcional. */
  image?: string;
  /** Uma frase resumindo o release. */
  intro: string;
  notes: ChangelogNote[];
}

/** Releases do mais novo para o mais antigo. */
export const CHANGELOG = raw as ChangelogEntry[];

/** Release mais recente — a nota que o jogador vê primeiro. */
export const LATEST = CHANGELOG[0];

/** Versão atual do jogo (fonte da verdade). */
export const CURRENT_VERSION = LATEST.version;

/** Uma versão conhecida? Evita gravar string arbitrária vinda do client. */
export function isKnownVersion(version: string): boolean {
  return CHANGELOG.some((e) => e.version === version);
}

/** [major, minor] de um semver; partes inválidas viram 0. */
function majorMinor(version: string): [number, number] {
  const [major, minor] = version.split('.').map((n) => Number.parseInt(n, 10) || 0);
  return [major ?? 0, minor ?? 0];
}

/**
 * `to` traz mecânica nova em relação a `from`? Só nesse caso o modal abre
 * sozinho — release de PATCH não interrompe quem está jogando.
 *
 * `from` nulo = jogador que nunca viu nenhuma nota (conta anterior ao recurso):
 * mostra, para ele descobrir que a nota existe.
 */
export function isFeatureRelease(from: string | null, to: string = CURRENT_VERSION): boolean {
  if (!from) return true;
  const [fromMajor, fromMinor] = majorMinor(from);
  const [toMajor, toMinor] = majorMinor(to);
  return toMajor > fromMajor || (toMajor === fromMajor && toMinor > fromMinor);
}

/** Tem nota não lida? (qualquer diferença de versão, inclusive PATCH.) */
export function hasUnreadChangelog(from: string | null): boolean {
  return from !== CURRENT_VERSION;
}
