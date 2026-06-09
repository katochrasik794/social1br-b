DO $$ BEGIN
  CREATE TYPE pamm_investment_status AS ENUM ('active', 'pending', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE mam_link_status AS ENUM ('active', 'paused', 'stopped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE mam_manager_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pamm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_pamm BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
  min_investment NUMERIC(18,2) NOT NULL DEFAULT 500,
  platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  force_kyc BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mam_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_mam BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
  min_account_balance NUMERIC(18,2) NOT NULL DEFAULT 1000,
  platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  force_kyc BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pamm_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  min_deposit NUMERIC(18,2) NOT NULL DEFAULT 500,
  fee_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  management_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 2,
  risk_profile TEXT NOT NULL DEFAULT 'medium',
  nav NUMERIC(18,2) NOT NULL DEFAULT 0,
  monthly_return_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  investors_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pamm_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES pamm_pools(id) ON DELETE SET NULL,
  pool_name TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  share_pct NUMERIC(8,4) NOT NULL DEFAULT 0,
  pnl_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  status pamm_investment_status NOT NULL DEFAULT 'active',
  invested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pamm_investments_user ON pamm_investments(user_id);

CREATE TABLE IF NOT EXISTS mam_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  headline TEXT,
  win_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  fee_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  lot_scaling TEXT NOT NULL DEFAULT 'Proportional',
  aum NUMERIC(18,2) NOT NULL DEFAULT 0,
  monthly_return_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  status mam_manager_status NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mam_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES mam_managers(id) ON DELETE SET NULL,
  manager_name TEXT NOT NULL,
  trading_account_id UUID REFERENCES trading_accounts(id) ON DELETE SET NULL,
  account_login TEXT,
  lot_multiplier NUMERIC(8,2) NOT NULL DEFAULT 1,
  max_lot NUMERIC(8,2) NOT NULL DEFAULT 1,
  pnl_pct NUMERIC(8,2) NOT NULL DEFAULT 0,
  status mam_link_status NOT NULL DEFAULT 'active',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mam_links_user ON mam_links(user_id);

INSERT INTO pamm_settings (enable_pamm, show_on_dashboard)
SELECT TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM pamm_settings LIMIT 1);

INSERT INTO mam_settings (enable_mam, show_on_dashboard)
SELECT TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM mam_settings LIMIT 1);
