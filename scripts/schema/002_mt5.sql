CREATE TABLE IF NOT EXISTS mt5_manager_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL DEFAULT 'Default',
  api_key TEXT NOT NULL,
  mt5_login INTEGER NOT NULL,
  mt5_password TEXT NOT NULL,
  mt5_server TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mt5_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL UNIQUE,
  dedicated_name TEXT,
  description TEXT,
  company TEXT,
  currency TEXT,
  server TEXT,
  margin_call NUMERIC(10, 2),
  margin_stop_out NUMERIC(10, 2),
  min_deposit NUMERIC(18, 2),
  max_deposit NUMERIC(18, 2),
  min_withdrawal NUMERIC(18, 2),
  max_withdrawal NUMERIC(18, 2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  raw_json JSONB NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mt5_groups_is_active ON mt5_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_mt5_groups_last_synced ON mt5_groups(last_synced_at);
