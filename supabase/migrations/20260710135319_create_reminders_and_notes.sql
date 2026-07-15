CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  time text NOT NULL DEFAULT '09:00',
  days text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_reminders" ON reminders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_reminders" ON reminders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_reminders" ON reminders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_reminders" ON reminders FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'yellow',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_notes" ON notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_notes" ON notes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_notes" ON notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_notes" ON notes FOR DELETE TO anon, authenticated USING (true);
