DO $$ BEGIN
  CREATE TYPE copier_commission_status AS ENUM ('accrued', 'paid', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Rate locked per subscription: % of copier profit the master earns
ALTER TABLE copier_subscriptions
  ADD COLUMN IF NOT EXISTS commission_from_copier_pct NUMERIC(5,2);

UPDATE copier_subscriptions cs
SET commission_from_copier_pct = cm.commission_pct
FROM copier_masters cm
WHERE cs.master_id = cm.id AND cs.commission_from_copier_pct IS NULL;

ALTER TABLE copier_subscriptions
  ALTER COLUMN commission_from_copier_pct SET DEFAULT 20;

UPDATE copier_subscriptions
SET commission_from_copier_pct = 20
WHERE commission_from_copier_pct IS NULL;

ALTER TABLE copier_subscriptions
  ALTER COLUMN commission_from_copier_pct SET NOT NULL;

ALTER TABLE copier_subscriptions
  DROP CONSTRAINT IF EXISTS copier_subscriptions_commission_from_copier_pct_check;

ALTER TABLE copier_subscriptions
  ADD CONSTRAINT copier_subscriptions_commission_from_copier_pct_check
  CHECK (commission_from_copier_pct >= 5 AND commission_from_copier_pct <= 50);

-- Ledger: master commission earned from each copier's copied-trade profit
CREATE TABLE IF NOT EXISTS copier_commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES copier_subscriptions(id) ON DELETE CASCADE,
  master_id UUID NOT NULL REFERENCES copier_masters(id) ON DELETE CASCADE,
  copier_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  copier_profit NUMERIC(18,2) NOT NULL CHECK (copier_profit >= 0),
  commission_pct NUMERIC(5,2) NOT NULL CHECK (commission_pct >= 5 AND commission_pct <= 50),
  commission_amount NUMERIC(18,2) NOT NULL CHECK (commission_amount >= 0),
  status copier_commission_status NOT NULL DEFAULT 'accrued',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_copier_commission_ledger_master_id ON copier_commission_ledger(master_id);
CREATE INDEX IF NOT EXISTS idx_copier_commission_ledger_subscription_id ON copier_commission_ledger(subscription_id);
CREATE INDEX IF NOT EXISTS idx_copier_commission_ledger_status ON copier_commission_ledger(status);
