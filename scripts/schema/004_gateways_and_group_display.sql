DO $$ BEGIN
  CREATE TYPE gateway_category AS ENUM (
    'gateway', 'cryptocurrency', 'wire_transfer', 'upi', 'local_depositor'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE mt5_groups ADD COLUMN IF NOT EXISTS badge_label TEXT;
ALTER TABLE mt5_groups ADD COLUMN IF NOT EXISTS plan_description TEXT;
ALTER TABLE mt5_groups ADD COLUMN IF NOT EXISTS spread_from TEXT;
ALTER TABLE mt5_groups ADD COLUMN IF NOT EXISTS max_leverage_display INTEGER DEFAULT 500;
ALTER TABLE mt5_groups ADD COLUMN IF NOT EXISTS commission_text TEXT;
ALTER TABLE mt5_groups ADD COLUMN IF NOT EXISTS min_lot_size TEXT DEFAULT '0.01 Lots';

CREATE TABLE IF NOT EXISTS manual_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category gateway_category NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  details TEXT,
  crypto_address TEXT,
  vpa_address TEXT,
  bank_name TEXT,
  account_number TEXT,
  icon_url TEXT,
  qr_code_url TEXT,
  processing_time_text TEXT NOT NULL DEFAULT '5-15 Mins',
  fee_display TEXT NOT NULL DEFAULT '0%',
  min_amount NUMERIC(18, 2) NOT NULL DEFAULT 20,
  max_amount NUMERIC(18, 2) NOT NULL DEFAULT 200000,
  limits_currency TEXT NOT NULL DEFAULT 'USD',
  network TEXT,
  warning_text TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_gateways_category ON manual_gateways(category);
CREATE INDEX IF NOT EXISTS idx_manual_gateways_active ON manual_gateways(is_active, sort_order);

ALTER TABLE deposits ADD COLUMN IF NOT EXISTS manual_gateway_id UUID REFERENCES manual_gateways(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_deposits_manual_gateway_id ON deposits(manual_gateway_id);

INSERT INTO manual_gateways (
  category, name, slug, crypto_address, network, icon_url,
  processing_time_text, fee_display, min_amount, max_amount, warning_text, sort_order, is_recommended
) VALUES
  (
    'cryptocurrency', 'TRC20', 'trc20',
    'TMUxCFrZbbD1sfkR61L9xSrtnHwgkpXyV7', 'TRON', '/deposit-icons/usdt.svg',
    '5-15 Mins', '0%', 20, 200000,
    'We will only accept TRC20 on the TRON network. Only use crypto addresses you personally own or control.',
    1, TRUE
  ),
  (
    'cryptocurrency', 'BEP20', 'bep20',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0', 'BSC', '/deposit-icons/usdt.svg',
    '5-15 Mins', '0%', 20, 500000,
    'We will only accept USDT BEP20 on the BSC network. Only use crypto addresses you personally own or control.',
    2, FALSE
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO manual_gateways (
  category, name, slug, vpa_address, icon_url,
  processing_time_text, fee_display, min_amount, max_amount, sort_order
) VALUES
  (
    'upi', 'UPI QR 1', 'upi-qr-1', 'merchant@upi', '/deposit-icons/upi.svg',
    'Instant - 5 Mins', '0%', 20, 100000, 1
  ),
  (
    'upi', 'UPI QR 2', 'upi-qr-2', 'payments@bankupi', '/deposit-icons/upi.svg',
    'Instant - 10 Mins', '0%', 50, 200000, 2
  )
ON CONFLICT (slug) DO NOTHING;
