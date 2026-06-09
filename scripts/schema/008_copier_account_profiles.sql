ALTER TABLE copier_master_accounts
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS strategy_summary TEXT,
  ADD COLUMN IF NOT EXISTS strategy_detail TEXT,
  ADD COLUMN IF NOT EXISTS risk_profile copier_risk_profile,
  ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS min_copy_amount NUMERIC(18,2) NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS public_profile BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS accept_new_copiers BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE copier_master_change_requests
  ADD COLUMN IF NOT EXISTS min_copy_amount NUMERIC(18,2) NOT NULL DEFAULT 25;

UPDATE copier_master_accounts cma
SET
  display_name = cm.display_name,
  headline = cm.headline,
  strategy_summary = cm.strategy_summary,
  strategy_detail = cm.strategy_detail,
  risk_profile = cm.risk_profile,
  commission_pct = cm.commission_pct
FROM copier_masters cm
WHERE cma.master_id = cm.id
  AND cma.display_name IS NULL;

UPDATE copier_master_accounts cma
SET
  display_name = cr.display_name,
  headline = cr.headline,
  strategy_summary = cr.strategy_summary,
  strategy_detail = cr.strategy_detail,
  risk_profile = cr.risk_profile,
  commission_pct = cr.commission_pct,
  min_copy_amount = COALESCE(cr.min_copy_amount, 25)
FROM copier_master_change_requests cr
WHERE cr.trading_account_id = cma.trading_account_id
  AND cr.status = 'approved';
