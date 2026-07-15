/*
# Create chat_messages, subscriptions, and image_generation_usage tables

## Summary
Creates three tables to support the JK Bot AI assistant:
1. chat_messages — stores user/assistant conversation history
2. subscriptions — UPI-based premium subscription tracking (no Razorpay)
3. image_generation_usage — daily image generation usage tracking

## New Tables

### chat_messages
- id (uuid PK), user_id (uuid NOT NULL DEFAULT auth.uid(), FK auth.users), 
  role (text: user/assistant), content (text), image_url (text nullable),
  created_at (timestamptz default now())

### subscriptions
- id (uuid PK), user_id (uuid NOT NULL DEFAULT auth.uid(), FK auth.users),
  plan (text: semi_annual/annual), status (text: active/expired),
  started_at (timestamptz), expires_at (timestamptz NOT NULL),
  upi_transaction_id (text nullable), created_at (timestamptz)

### image_generation_usage
- id (uuid PK), user_id (uuid NOT NULL DEFAULT auth.uid(), FK auth.users),
  date (date NOT NULL), count (int NOT NULL default 0),
  created_at (timestamptz), UNIQUE(user_id, date)

## Security
- RLS enabled on all three tables
- Owner-scoped CRUD policies (4 per table) scoped to authenticated with auth.uid() = user_id
- user_id defaults to auth.uid() so client inserts that omit it still pass WITH CHECK
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chat_messages" ON chat_messages;
CREATE POLICY "update_own_chat_messages" ON chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

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
