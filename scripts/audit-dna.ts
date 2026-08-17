/**
 * AUDITORIA DE DNA — amostragem e checagem de coerência estrutural
 * ===========================================================================
 * Gera N plantas e audita o DNA. NÃO chama IA nem gera imagem: só roda o
 * sorteio puro (`generateRandomDNA`) e inspeciona o objeto resultante.
 *
 *   npx tsx scripts/audit-dna.ts [n]      (padrão: 50)
 *
 * O ponto é achar CONTRADIÇÃO: arquétipo e perk são sorteados por caminhos
 * diferentes, então nada impede, por construção, um cacto (sem folhas, só
 * espinhos) receber "folhas peludas", ou uma suculenta (sem caule) receber
 * "dois caules principais". O prompt receberia as duas frases e o gerador
 * teria que escolher qual obedecer — é exatamente esse tipo de lixo que este
 * script existe para revelar antes de virar imagem.
 * ===========================================================================
 */
import { generateRandomDNA } from '../src/services/dnaService';
import { ARCHETYPES, type PlantArchetype } from '../src/config/genome/archetypes';
import { TRAITS_BY_NAME } from '../src/config/genome/traits';
import { rarityRank } from '../src/config/rarity';
import type { PlantDNA } from '../src/types';

const N = Number(process.argv[2] ?? 50);

// ── Regras de coerência ────────────────────────────────────────────────────

/** Perks cujo texto fala de FOLHA — não fazem sentido em planta sem folha. */
const PERKS_DE_FOLHA = ['folhas_peludas', 'folhas_degrade', 'folhas_espiral', 'folhagem_atipica'];
/** Perks cujo texto fala de CAULE — não fazem sentido em planta sem caule. */
const PERKS_DE_CAULE = ['caule_retorcido', 'caule_duplo', 'cipos'];
/** Arquiteturas em que não existe lâmina foliar para adornar. */
const SEM_FOLHA_REAL = ['spines', 'scale'];

type Achado = { tipo: string; detalhe: string };

function auditar(dna: PlantDNA): Achado[] {
  const out: Achado[] = [];
  const f = dna.form;
  const arch = ARCHETYPES[(f.archetype ?? 'erva') as PlantArchetype];
  const perks = dna.traits.map((t) => t.name);
  const add = (tipo: string, detalhe: string) => out.push({ tipo, detalhe });

  // 1. Reprodução × flor/fruto
  const repro = f.reproduction ?? 'flower';
  if (repro !== 'flower' && (f.has_flowers || f.has_flowers_young)) {
    add('FLOR_EM_NAO_FLORIFERA', `${f.archetype} reproduz por ${repro} mas tem flor`);
  }
  if (f.has_fruit && !f.has_flowers && !f.has_flowers_young) {
    add('FRUTO_SEM_FLOR', `${f.archetype} tem fruto sem nunca ter flor`);
  }
  if (f.flower_color_hex && !f.has_flowers && !f.has_flowers_young) {
    add('COR_DE_FLOR_ORFA', `${f.archetype} guarda cor de flor sem ter flor`);
  }

  // 2. Perk de folha em planta sem folha (cacto/escama)
  if (SEM_FOLHA_REAL.includes(f.leaf_architecture ?? 'simple')) {
    for (const p of perks.filter((p) => PERKS_DE_FOLHA.includes(p))) {
      add('PERK_DE_FOLHA_SEM_FOLHA', `${f.archetype} (${f.leaf_architecture}) recebeu "${p}"`);
    }
  }

  // 3. Perk de caule em planta sem caule
  if (f.stem_style === 'none') {
    for (const p of perks.filter((p) => PERKS_DE_CAULE.includes(p))) {
      add('PERK_DE_CAULE_SEM_CAULE', `${f.archetype} (stem none) recebeu "${p}"`);
    }
  }

  // 4. Trava de raridade respeitada
  for (const p of perks) {
    const def = TRAITS_BY_NAME[p];
    if (def?.minRarity && rarityRank(dna.rarity) < rarityRank(def.minRarity)) {
      add('PERK_ACIMA_DA_RARIDADE', `${dna.rarity} recebeu "${p}" (exige ${def.minRarity})`);
    }
  }

  // 5. Perk duplicado
  const dup = perks.filter((p, i) => perks.indexOf(p) !== i);
  if (dup.length) add('PERK_DUPLICADO', dup.join(', '));

  // 6. Arquétipo respeitou os próprios trilhos
  if (arch.stem_style && f.stem_style !== arch.stem_style) {
    add('TRILHO_DE_CAULE_QUEBRADO', `${f.archetype} deveria ser ${arch.stem_style}, veio ${f.stem_style}`);
  }
  if (arch.growth_pattern && f.growth_pattern !== arch.growth_pattern) {
    add('TRILHO_DE_CRESCIMENTO_QUEBRADO', `${f.archetype}: ${f.growth_pattern}`);
  }
  if (f.leaf_architecture !== arch.leaf_architecture) {
    add('TRILHO_DE_FOLHA_QUEBRADO', `${f.archetype}: ${f.leaf_architecture}`);
  }

  // 7. Campos obrigatórios presentes e sãos
  if (!dna.biome || !dna.rarity || !dna.personality) add('CAMPO_FALTANDO', 'biome/rarity/personality');
  if (!f.max_height_cm || f.max_height_cm < 1) add('ALTURA_INVALIDA', String(f.max_height_cm));
  if (!perks.length) add('SEM_NENHUM_PERK', 'planta sem perk algum');

  return out;
}

// ── Execução ───────────────────────────────────────────────────────────────

const amostras: PlantDNA[] = Array.from({ length: N }, () => generateRandomDNA());

const conta = <T extends string | number>(vals: T[]) =>
  vals.reduce<Record<string, number>>((m, v) => ((m[String(v)] = (m[String(v)] ?? 0) + 1), m), {});

const tabela = (titulo: string, m: Record<string, number>) => {
  console.log(`\n${titulo}`);
  Object.entries(m)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(22)} ${String(v).padStart(3)}  ${((v / N) * 100).toFixed(1)}%`));
};

console.log(`\n═══ AUDITORIA DE DNA — ${N} gerações (sem IA) ═══`);

tabela('ARQUÉTIPO', conta(amostras.map((d) => d.form.archetype ?? 'erva')));
tabela('RARIDADE', conta(amostras.map((d) => d.rarity)));
tabela('ARQUITETURA DA FOLHA', conta(amostras.map((d) => d.form.leaf_architecture ?? 'simple')));
tabela('REPRODUÇÃO', conta(amostras.map((d) => d.form.reproduction ?? 'flower')));
tabela('PERKS', conta(amostras.flatMap((d) => d.traits.map((t) => t.name))));

console.log('\nPERKS POR PLANTA (média por raridade)');
const porRaridade = amostras.reduce<Record<string, number[]>>((m, d) => {
  (m[d.rarity] ??= []).push(d.traits.length);
  return m;
}, {});
for (const [r, ns] of Object.entries(porRaridade)) {
  const media = ns.reduce((a, b) => a + b, 0) / ns.length;
  console.log(`  ${r.padEnd(10)} n=${String(ns.length).padStart(3)}  média ${media.toFixed(2)}  (min ${Math.min(...ns)} máx ${Math.max(...ns)})`);
}

// ── Conflitos ──────────────────────────────────────────────────────────────

const achados = amostras.flatMap((d, i) => auditar(d).map((a) => ({ i, ...a })));

console.log(`\n═══ CONFLITOS: ${achados.length} em ${N} plantas ═══`);
if (!achados.length) {
  console.log('  nenhum — estrutura coerente');
} else {
  const porTipo = conta(achados.map((a) => a.tipo));
  Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipo, n]) => {
      console.log(`\n  ${tipo}  (${n}x)`);
      achados
        .filter((a) => a.tipo === tipo)
        .slice(0, 4)
        .forEach((a) => console.log(`    #${a.i}: ${a.detalhe}`));
      if (n > 4) console.log(`    … e mais ${n - 4}`);
    });
}
console.log('');
