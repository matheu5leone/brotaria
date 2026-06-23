-- Migration: Shovel system
-- Adds free-position columns to pots, dig timer, and shovel cooldown to profiles.

ALTER TABLE pots ADD COLUMN IF NOT EXISTS pos_x FLOAT;
ALTER TABLE pots ADD COLUMN IF NOT EXISTS pos_y FLOAT;
ALTER TABLE pots ADD COLUMN IF NOT EXISTS digging_started_at TIMESTAMPTZ;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shovel_last_used_at TIMESTAMPTZ;

-- Backfill existing pots with default 3x3 grid positions so old gardens keep
-- their layout. New pots (created by the shovel) always have explicit positions.
WITH ranked AS (
  SELECT id,
    (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1) AS rn
  FROM pots
  WHERE pos_x IS NULL
)
UPDATE pots p
SET
  pos_x = (ARRAY[22.0, 50.0, 78.0, 22.0, 50.0, 78.0, 22.0, 50.0, 78.0])[LEAST(ranked.rn::int + 1, 9)],
  pos_y = (ARRAY[30.0, 30.0, 30.0, 54.0, 54.0, 54.0, 78.0, 78.0, 78.0])[LEAST(ranked.rn::int + 1, 9)]
FROM ranked
WHERE p.id = ranked.id;
