/*
# Add user_id columns (nullable) and switch to owner-scoped RLS policies

## Summary
Converts the app from single-tenant (no auth) to multi-user (auth required).
Each table gets a nullable `user_id` column with DEFAULT auth.uid().
RLS policies are owner-scoped to authenticated users only.

## Important Notes
1. user_id is added as NULLABLE because existing rows have no owner.
   New rows get auth.uid() via DEFAULT. Existing rows remain NULL and are
   invisible to authenticated users (expected during auth transition).
2. DEFAULT auth.uid() ensures new inserts get the current user's ID automatically.
3. All policies scope to TO authenticated with auth.uid() = user_id.
*/

-- ============ chat_messages ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;

CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_update" ON chat_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ notes ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE notes ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

DROP POLICY IF EXISTS "notes_select" ON notes;
DROP POLICY IF EXISTS "notes_insert" ON notes;
DROP POLICY IF EXISTS "notes_update" ON notes;
DROP POLICY IF EXISTS "notes_delete" ON notes;

CREATE POLICY "notes_select" ON notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "notes_insert" ON notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_update" ON notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_delete" ON notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ reminders ============
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE reminders ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);

DROP POLICY IF EXISTS "reminders_select" ON reminders;
DROP POLICY IF EXISTS "reminders_insert" ON reminders;
DROP POLICY IF EXISTS "reminders_update" ON reminders;
DROP POLICY IF EXISTS "reminders_delete" ON reminders;

CREATE POLICY "reminders_select" ON reminders FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "reminders_insert" ON reminders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reminders_update" ON reminders FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reminders_delete" ON reminders FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
