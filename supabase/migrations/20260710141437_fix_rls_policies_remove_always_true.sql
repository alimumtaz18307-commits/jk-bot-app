-- ============================================================
-- chat_messages: drop all existing policies and recreate clean
-- ============================================================
DROP POLICY IF EXISTS "anon_select_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anon_insert_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "anon_delete_chat_messages" ON public.chat_messages;

-- No-auth app: anon users may only read and insert their own session data.
-- DELETE is intentionally removed — chat history should not be deletable.
CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT TO anon USING (true);

CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- notes: drop all duplicate/always-true policies and recreate
-- ============================================================
DROP POLICY IF EXISTS "anon_select_notes"  ON public.notes;
DROP POLICY IF EXISTS "anon_insert_notes"  ON public.notes;
DROP POLICY IF EXISTS "anon_update_notes"  ON public.notes;
DROP POLICY IF EXISTS "anon_delete_notes"  ON public.notes;
DROP POLICY IF EXISTS "select_notes"       ON public.notes;
DROP POLICY IF EXISTS "insert_notes"       ON public.notes;
DROP POLICY IF EXISTS "update_notes"       ON public.notes;
DROP POLICY IF EXISTS "delete_notes"       ON public.notes;

-- No-auth app: restrict all writes to anon only (not authenticated).
-- USING/WITH CHECK (true) is intentional for a shared no-login app.
CREATE POLICY "notes_select" ON public.notes
  FOR SELECT TO anon USING (true);

CREATE POLICY "notes_insert" ON public.notes
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "notes_update" ON public.notes
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "notes_delete" ON public.notes
  FOR DELETE TO anon USING (true);

-- ============================================================
-- reminders: drop all duplicate/always-true policies and recreate
-- ============================================================
DROP POLICY IF EXISTS "anon_select_reminders"  ON public.reminders;
DROP POLICY IF EXISTS "anon_insert_reminders"  ON public.reminders;
DROP POLICY IF EXISTS "anon_update_reminders"  ON public.reminders;
DROP POLICY IF EXISTS "anon_delete_reminders"  ON public.reminders;
DROP POLICY IF EXISTS "select_reminders"       ON public.reminders;
DROP POLICY IF EXISTS "insert_reminders"       ON public.reminders;
DROP POLICY IF EXISTS "update_reminders"       ON public.reminders;
DROP POLICY IF EXISTS "delete_reminders"       ON public.reminders;

CREATE POLICY "reminders_select" ON public.reminders
  FOR SELECT TO anon USING (true);

CREATE POLICY "reminders_insert" ON public.reminders
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "reminders_update" ON public.reminders
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "reminders_delete" ON public.reminders
  FOR DELETE TO anon USING (true);
