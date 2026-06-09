DO $$ BEGIN
  CREATE TYPE copier_risk_profile AS ENUM ('low', 'medium', 'high');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE copier_master_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE copier_copy_mode AS ENUM ('proportional', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE copier_subscription_status AS ENUM ('active', 'paused', 'stopped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS copier_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_copier BOOLEAN NOT NULL DEFAULT TRUE,
  enable_master_applications BOOLEAN NOT NULL DEFAULT TRUE,
  min_allocation NUMERIC(18,2) NOT NULL DEFAULT 100,
  max_allocation NUMERIC(18,2) NOT NULL DEFAULT 50000,
  platform_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  auto_stop_equity_drop_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  max_drawdown_allowed_pct NUMERIC(5,2) NOT NULL DEFAULT 30,
  force_kyc BOOLEAN NOT NULL DEFAULT FALSE,
  show_on_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
  payout_cycle TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO copier_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM copier_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS copier_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  strategy_summary TEXT NOT NULL,
  strategy_detail TEXT,
  risk_profile copier_risk_profile NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL CHECK (commission_pct >= 5 AND commission_pct <= 50),
  status copier_master_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copier_masters_status ON copier_masters(status);
CREATE INDEX IF NOT EXISTS idx_copier_masters_user_id ON copier_masters(user_id);

CREATE TABLE IF NOT EXISTS copier_master_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES copier_masters(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (master_id, trading_account_id)
);

CREATE INDEX IF NOT EXISTS idx_copier_master_accounts_master_id ON copier_master_accounts(master_id);

CREATE TABLE IF NOT EXISTS copier_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copier_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  master_id UUID NOT NULL REFERENCES copier_masters(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  allocation NUMERIC(18,2) NOT NULL,
  copy_mode copier_copy_mode NOT NULL DEFAULT 'proportional',
  lot_multiplier NUMERIC(8,4) NOT NULL DEFAULT 1,
  daily_loss_limit_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  status copier_subscription_status NOT NULL DEFAULT 'active',
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (copier_user_id, master_id, trading_account_id)
);

CREATE INDEX IF NOT EXISTS idx_copier_subscriptions_copier_user_id ON copier_subscriptions(copier_user_id);
CREATE INDEX IF NOT EXISTS idx_copier_subscriptions_master_id ON copier_subscriptions(master_id);
