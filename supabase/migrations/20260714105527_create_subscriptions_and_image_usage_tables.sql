/*
# Create subscriptions and image_generation_usage tables

## Summary
Creates two new tables to support the UPI-based premium subscription system
and the image generation daily-usage tracking. Razorpay is fully removed —
subscriptions are now activated manually by the developer after verifying
a UPI payment. No payment gateway or edge function is needed.

## New Tables

### subscriptions
- `id` (uuid, primary key, auto-generated)
- `user_id` (uuid, NOT NULL, defaults to auth.uid(), references auth.users ON DELETE CASCADE)
- `plan` (text, NOT NULL) — either "semi_annual" or "annual"
- `status` (text, NOT NULL, default "active") — "active" or "expired"
- `started_at` (timestamptz, default now())
- `expires_at` (timestamptz, NOT NULL)
- `upi_transaction_id` (text, nullable) — UPI reference number provided by the user
- `created_at` (timestamptz, default now())

### image_generation_usage
- `id` (uuid, primary key, auto-generated)
- `user_id` (uuid, NOT NULL, defaults to auth.uid(), references auth.users ON DELETE CASCADE)
- `date` (date, NOT NULL) — the calendar day this usage record covers
- `count` (integer, NOT NULL, default 0)
- Unique constraint on (user_id, date) so only one record per user per day

## Security
- RLS enabled on both tables.
- Owner-scoped CRUD policies (4 per table: SELECT, INSERT, UPDATE, DELETE),
  scoped to `authenticated` with `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()` so client inserts that omit it still pass
  the WITH CHECK policy.
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('semi_annual', 'annual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  upi_transaction_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscriptions" ON subscriptions;
CREATE POLICY "update_own_subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_subscriptions" ON subscriptions;
CREATE POLICY "delete_own_subscriptions" ON subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS image_generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE image_generation_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_image_usage" ON image_generation_usage;
CREATE POLICY "select_own_image_usage" ON image_generation_usage FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_image_usage" ON image_generation_usage;
CREATE POLICY "insert_own_image_usage" ON image_generation_usage FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_image_usage" ON image_generation_usage;
CREATE POLICY "update_own_image_usage" ON image_generation_usage FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_image_usage" ON image_generation_usage;
CREATE POLICY "delete_own_image_usage" ON image_generation_usage FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
