-- Add unique index on patterns.dimension_keys so ON CONFLICT (dimension_keys) works
-- This index was missing, causing the pattern worker to crash on every run
-- before reaching LLM generation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_patterns_dimension_keys_unique
  ON patterns (dimension_keys);
