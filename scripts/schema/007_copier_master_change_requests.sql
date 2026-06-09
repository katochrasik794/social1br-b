DO $$ BEGIN
  CREATE TYPE copier_change_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS copier_master_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES copier_masters(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trading_account_id UUID NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  headline TEXT NOT NULL,
  strategy_summary TEXT NOT NULL,
  strategy_detail TEXT,
  risk_profile copier_risk_profile NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL CHECK (commission_pct >= 5 AND commission_pct <= 50),
  status copier_change_request_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copier_master_change_requests_master_id ON copier_master_change_requests(master_id);
CREATE INDEX IF NOT EXISTS idx_copier_master_change_requests_status ON copier_master_change_requests(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_copier_master_change_requests_one_pending
  ON copier_master_change_requests(master_id)
  WHERE status = 'pending';
