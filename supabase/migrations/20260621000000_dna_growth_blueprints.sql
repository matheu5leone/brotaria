-- Mudança 9: rastreabilidade do modelo + blueprints de escala por estágio.

-- 1) Coluna usada por growthService ao salvar versões (antes inexistente -> insert falhava silenciosamente)
ALTER TABLE plant_versions ADD COLUMN IF NOT EXISTS model_used TEXT;

-- 2) prompt_context dos 4 estágios que geram imagem, espelhando src/config/genome/stageBlueprints.ts.
--    (Em runtime a fonte de verdade é o .ts; aqui fica como documentação/configuração.)
UPDATE plant_stages SET prompt_context =
  'A tiny just-emerged sprout, ~10% of final adult height. Just 2 small starter leaves, no real stem yet. Traits barely hinted. Must look small and newborn.'
  WHERE code = 'broto_1';

UPDATE plant_stages SET prompt_context =
  'A young plant, ~3x taller than the sprout. Thin visible stem appears. 4-6 leaves in the plant''s leaf style. Traits start to show faintly.'
  WHERE code = 'pequena_1';

UPDATE plant_stages SET prompt_context =
  'An established plant, ~2x larger than the young stage, filling more of the frame. Thicker stem with first branches. Fuller foliage (8-14 leaves). Buds/early flowers if applicable. Traits clearly visible.'
  WHERE code = 'media_1';

UPDATE plant_stages SET prompt_context =
  'A fully mature adult plant at full height. Lush dense canopy, thick main stem with multiple branches. Blooming flowers/ripe fruit if applicable. Traits at full strength. Dominates the frame — unmistakably an adult plant, NOT a small one.'
  WHERE code = 'grande_1';
