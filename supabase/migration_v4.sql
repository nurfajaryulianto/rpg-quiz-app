-- ============================================================
-- Migration v4: Question Archives (Bank Soal) System
-- ============================================================

-- Bank soal (koleksi soal)
CREATE TABLE question_archives (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Soal dalam bank soal
CREATE TABLE archive_questions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  archive_id    UUID NOT NULL REFERENCES question_archives(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice'
    CHECK (question_type IN ('multiple_choice','true_false','binary','checkbox','essay')),
  category      TEXT,
  difficulty    TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy','medium','hard','very_hard')),
  default_points INTEGER NOT NULL DEFAULT 10,
  order_index   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Pilihan jawaban untuk soal dalam bank
CREATE TABLE archive_options (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES archive_questions(id) ON DELETE CASCADE,
  option_text  TEXT NOT NULL,
  option_label TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT FALSE
);

-- Many-to-many: batch memakai satu atau beberapa bank soal
CREATE TABLE batch_archives (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id   UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  archive_id UUID NOT NULL REFERENCES question_archives(id) ON DELETE CASCADE,
  UNIQUE (batch_id, archive_id)
);

-- Konfigurasi jumlah soal per tipe per batch (dari bank soal)
CREATE TABLE batch_question_settings (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id             UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  question_type        TEXT NOT NULL
    CHECK (question_type IN ('multiple_choice','true_false','binary','checkbox','essay')),
  count                INTEGER NOT NULL DEFAULT 0,
  points_per_question  NUMERIC NOT NULL DEFAULT 0,
  include_difficulties TEXT[] DEFAULT ARRAY['easy','medium','hard','very_hard'],
  UNIQUE (batch_id, question_type)
);

-- RLS
ALTER TABLE question_archives      ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_options        ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_archives         ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_question_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON question_archives       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON archive_questions       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON archive_options         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON batch_archives          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON batch_question_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_archive_questions_archive_id     ON archive_questions(archive_id);
CREATE INDEX idx_archive_questions_type_diff      ON archive_questions(question_type, difficulty);
CREATE INDEX idx_archive_options_question_id      ON archive_options(question_id);
CREATE INDEX idx_batch_archives_batch_id          ON batch_archives(batch_id);
CREATE INDEX idx_batch_question_settings_batch_id ON batch_question_settings(batch_id);
