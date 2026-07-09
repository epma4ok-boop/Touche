-- ============================================================
-- Touché — Intimacy Index migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Extend couples table
ALTER TABLE couples
  ADD COLUMN IF NOT EXISTS intimacy_score  INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days     INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE,
  ADD COLUMN IF NOT EXISTS level           INT     DEFAULT 0;

-- 2. Daily tasks (one set per couple per day, 3 tiers)
CREATE TABLE IF NOT EXISTS daily_tasks (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id    UUID      REFERENCES couples(id) ON DELETE CASCADE,
  date         DATE      NOT NULL,
  category     TEXT      NOT NULL CHECK (category IN ('tenderness','desire','passion')),
  task_text    TEXT      NOT NULL,
  points       INT       NOT NULL,
  status_a     TEXT      DEFAULT 'pending' CHECK (status_a IN ('pending','done')),
  status_b     TEXT      DEFAULT 'pending' CHECK (status_b IN ('pending','done')),
  completed_at TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (couple_id, date, category)
);

-- 3. Action log (each task completion by each user)
CREATE TABLE IF NOT EXISTS couple_actions (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id    UUID      REFERENCES couples(id) ON DELETE CASCADE,
  task_id      UUID      REFERENCES daily_tasks(id) ON DELETE SET NULL,
  category     TEXT      NOT NULL,
  points       INT       NOT NULL,
  completed_by TEXT      NOT NULL CHECK (completed_by IN ('user_a','user_b','both')),
  completed_at TIMESTAMP DEFAULT NOW()
);

-- 4. Daily intimacy history (for 30-day chart)
CREATE TABLE IF NOT EXISTS intimacy_history (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id       UUID  REFERENCES couples(id) ON DELETE CASCADE,
  date            DATE  NOT NULL,
  points_gained   INT   DEFAULT 0,
  points_lost     INT   DEFAULT 0,
  total_score     INT   NOT NULL,
  tasks_completed INT   DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE (couple_id, date)
);

-- 5. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_daily_tasks_couple_date    ON daily_tasks    (couple_id, date);
CREATE INDEX IF NOT EXISTS idx_couple_actions_couple_date ON couple_actions (couple_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_intimacy_history_couple    ON intimacy_history (couple_id, date);
