-- Tabela principal do inventário (substitui seeds para armazenar itens)
CREATE TABLE IF NOT EXISTS inventory_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 0 AND 9),
  item_type  TEXT NOT NULL CHECK (item_type IN ('seed', 'wrapping_kit', 'wrapped_plant', 'plant')),
  plant_id   UUID REFERENCES plants(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 10),
  label      TEXT CHECK (char_length(label) <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_user ON inventory_items(user_id);

-- Migrar seeds existentes para inventory_items (1 slot por usuário, max 10)
INSERT INTO inventory_items (user_id, slot_index, item_type, quantity)
SELECT user_id, 0, 'seed', LEAST(COUNT(*)::INTEGER, 10)
FROM seeds
GROUP BY user_id
ON CONFLICT (user_id, slot_index) DO NOTHING;
