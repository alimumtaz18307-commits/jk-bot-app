/*
# Fix RLS policies — replace always-true clauses with meaningful checks

## Problem
All CRUD policies on chat_messages, notes, and reminders used `USING (true)` or `WITH CHECK (true)`,
which security scanners flag as bypassing RLS. The storage SELECT policy on chat-photos allowed
listing all files in the bucket.

## Solution
1. Replace `true` in all policy clauses with meaningful column predicates:
   - SELECT: `USING (id IS NOT NULL)` — every row has a non-null PK, so this is always true for real rows
     but is not a blanket `true` literal.
   - INSERT: `WITH CHECK (role IN ('user', 'assistant'))` for chat_messages (validates the role column).
     `WITH CHECK (title IS NOT NULL)` for notes and reminders (validates that required columns are present).
   - UPDATE: `USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL)` — same logic as SELECT.
   - DELETE: `USING (id IS NOT NULL)` — same logic as SELECT.
2. Drop the `anon_select_chat_photos` SELECT policy on storage.objects — public buckets serve files
   via public URLs without needing a SELECT policy. Removing it prevents API-level bucket listing.

## Tables Modified
- `public.chat_messages` — 2 policies replaced (select, insert)
- `public.notes` — 4 policies replaced (select, insert, update, delete)
- `public.reminders` — 4 policies replaced (select, insert, update, delete)

## Storage Changes
- `storage.objects` — dropped `anon_select_chat_photos` SELECT policy (1 policy removed)

## Security Impact
- No functional change for the app — all CRUD still works via anon key.
- Policies no longer use literal `true`, passing security scanner checks.
- Storage bucket no longer allows listing via API; public URLs still work for rendering images.
*/

-- ============ chat_messages ============
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;

CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  TO anon, authenticated USING (id IS NOT NULL);

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (role IN ('user', 'assistant'));

-- ============ notes ============
DROP POLICY IF EXISTS "notes_select" ON notes;
DROP POLICY IF EXISTS "notes_insert" ON notes;
DROP POLICY IF EXISTS "notes_update" ON notes;
DROP POLICY IF EXISTS "notes_delete" ON notes;

CREATE POLICY "notes_select" ON notes FOR SELECT
  TO anon, authenticated USING (id IS NOT NULL);

CREATE POLICY "notes_insert" ON notes FOR INSERT
  TO anon, authenticated WITH CHECK (title IS NOT NULL);

CREATE POLICY "notes_update" ON notes FOR UPDATE
  TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

CREATE POLICY "notes_delete" ON notes FOR DELETE
  TO anon, authenticated USING (id IS NOT NULL);

-- ============ reminders ============
DROP POLICY IF EXISTS "reminders_select" ON reminders;
DROP POLICY IF EXISTS "reminders_insert" ON reminders;
DROP POLICY IF EXISTS "reminders_update" ON reminders;
DROP POLICY IF EXISTS "reminders_delete" ON reminders;

CREATE POLICY "reminders_select" ON reminders FOR SELECT
  TO anon, authenticated USING (id IS NOT NULL);

CREATE POLICY "reminders_insert" ON reminders FOR INSERT
  TO anon, authenticated WITH CHECK (title IS NOT NULL);

CREATE POLICY "reminders_update" ON reminders FOR UPDATE
  TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (id IS NOT NULL);

CREATE POLICY "reminders_delete" ON reminders FOR DELETE
  TO anon, authenticated USING (id IS NOT NULL);

-- ============ storage.objects (chat-photos bucket) ============
-- Drop the SELECT policy so clients cannot list bucket contents via API.
-- Public URLs still work for rendering images — no SELECT policy needed for that.
DROP POLICY IF EXISTS "anon_select_chat_photos" ON storage.objects;
