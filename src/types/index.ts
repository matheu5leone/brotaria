export type Biome =
  | 'planicie' | 'floresta' | 'deserto' | 'montanha' | 'pantano'
  | 'oceano' | 'vulcao' | 'tundra' | 'selva' | 'caverna';
export type Rarity = 'comum' | 'incomum' | 'raro' | 'epico' | 'lendario' | 'brotaria';
export type HydrationStatus = 'hydrated' | 'waiting_water' | 'paused';

export type LeafStyle = 'rounded' | 'pointed' | 'heart' | 'serrated' | 'needle' | 'fan' | 'lobed';
export type LeafDensity = 'sparse' | 'medium' | 'dense';
export type StemStyle = 'straight' | 'curvy' | 'twisting' | 'branching' | 'none';
export type StemThickness = 'thin' | 'medium' | 'thick' | 'woody';
export type GrowthPattern = 'tall' | 'bushy' | 'vine' | 'compact' | 'spreading';

/** Cor do genoma: nome legível + dois hex (corpo e detalhe). */
export interface DNAColor {
  name: string;
  primary_hex: string;
  secondary_hex: string;
}

/** Forma botânica imutável da planta (o "genoma visual"). */
export interface DNAForm {
  /** Plano corporal (erva, samambaia, cacto…). Ausente = planta anterior ao
   *  arquétipo, que é lida como 'erva'. Ver config/genome/archetypes.ts. */
  archetype?: string;
  /** Folha simples ou composta (folíolos num ráquis), fita, espinho… */
  leaf_architecture?: string;
  /** flower | spore | cone — decide se flor é sequer possível. */
  reproduction?: string;
  leaf_style: LeafStyle;
  leaf_density: LeafDensity;
  stem_style: StemStyle;
  stem_thickness_grown: StemThickness; // grossura do caule principal na fase grande
  growth_pattern: GrowthPattern;
  max_height_cm: number; // altura final (fase grande), randomizada
  has_flowers: boolean;          // flores na fase adulta (média/grande)
  has_flowers_young: boolean;    // flores já na fase jovem/broto (chance menor)
  flower_color_hex?: string;
  has_fruit: boolean;
  fruit_color_hex?: string;
  /** Rolado no plantio: potencial de virar árvore ao atingir o porte grande.
   *  Guardado para uma feature futura (ainda não implementada). */
  tree_potential: boolean;
}

/** Instância de um perk no DNA, com params já sorteados (forma adulta). */
export interface TraitInstance {
  name: string;
  params: Record<string, any>;
}

export interface PlantDNA {
  biome: Biome | string;
  rarity: Rarity;
  personality: string;
  color: DNAColor;
  form: DNAForm;
  traits: TraitInstance[];
}

/** ---- Configuração do genoma (src/config/genome) ---- */

/** Esquema de um parâmetro sorteável de um perk. */
export type TraitParamSpec =
  | { key: string; type: 'int'; min: number; max: number }
  | { key: string; type: 'bool'; chance?: number } // chance 0..1 de ser true (default 0.5)
  | { key: string; type: 'enum'; values: string[] }
  | { key: string; type: 'color' }; // sorteia um hex

/** Definição de um perk no catálogo: dados + como descrever. */
export interface TraitDef {
  name: string;
  params: TraitParamSpec[];
  /** Renderiza o perk em prosa, considerando a fração de crescimento (0..1). */
  render: (params: Record<string, any>, growthFraction: number) => string;
}

/** Blueprint de escala por estágio. */
export interface StageBlueprint {
  /** Fração da altura adulta neste estágio (0..1). */
  height_fraction: number;
  /** Diretiva textual de morfologia/escala injetada no prompt. */
  directive: string;
}

export interface PlantStage {
  id: string;
  code: string;
  name: string;
  order_index: number;
  waters_required: number;
  generate_image: boolean;
  prompt_context: string | null;
}

export interface Plant {
  id: string;
  user_id: string;
  pot_id: string | null;
  dna: PlantDNA;
  current_stage_id: string;
  last_watered_at: string;
  next_water_needed_at: string;
  hydration_status: HydrationStatus;
  created_at: string;
}

export interface Pot {
  id: string;
  user_id: string;
  plant_id: string | null;
  pos_x: number | null;
  pos_y: number | null;
  digging_started_at: string | null;
  /**
   * Duração da obra deste canteiro, fixada no ato de cavar conforme o nº de
   * canteiros vazios de então. Null em canteiros anteriores ao redesign da pá.
   */
  dig_duration_ms: number | null;
  /** Raridade do solo, sorteada ao cavar. Inerte por enquanto (ver spec). */
  soil_rarity: Rarity | null;
  /** Quando o jogador tocou em "Concluir". Null + obra vencida = espera o toque. */
  dig_claimed_at: string | null;
  /** Precisão do minigame, guardada para o sorteio de material na conclusão. */
  dig_accuracy: number | null;
  created_at: string;
}

export interface Seed {
  id: string;
  user_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  coins: number;
  created_at: string;
}

export type InventoryItemType =
  | 'seed'
  | 'wrapping_kit'
  | 'wrapped_plant'
  | 'plant'
  /** Coletado da abelha; empilha até 20 (ver STACK_MAX_BY_TYPE). */
  | 'polen'
  /** Forjado com pólen; não empilha (1 por slot). */
  | 'elixir'
  /** Materiais que saem da terra ao concluir uma obra. Inertes por enquanto. */
  | 'minhoca'
  | 'terra_molhada';

export interface InventoryItem {
  id: string;
  user_id: string;
  slot_index: number;
  item_type: InventoryItemType;
  plant_id: string | null;
  quantity: number;
  label: string | null;
  /** Só em sementes recicladas: raridade garantida (null = semente genérica). */
  rarity: Rarity | null;
  /** Só em sementes-bioma (colheita da adulta): bioma travado (null = sem bioma). */
  biome: Biome | null;
  created_at: string;
}
