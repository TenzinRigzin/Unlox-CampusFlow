-- Initial Supabase schema migration

CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- ensure uuid generation functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- Table: students
CREATE TABLE IF NOT EXISTS students (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL,
    branch        text NOT NULL,
    year          int NOT NULL,
    subjects      text[] NOT NULL DEFAULT '{}',
    phone         text NOT NULL UNIQUE,
    email         text NOT NULL UNIQUE,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- Table: tasks
CREATE TABLE IF NOT EXISTS tasks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title           text NOT NULL,
    subject         text NOT NULL,
    deadline        timestamptz NOT NULL,
    reminder_time   timestamptz NOT NULL,
    add_to_calendar boolean NOT NULL DEFAULT true,
    source_text     text,
    ai_study_plan   jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Table: task_details
CREATE TABLE IF NOT EXISTS task_details (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id                      uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    long_summary                 text NOT NULL,
    links                        text[] NOT NULL DEFAULT '{}',
    notes_or_attachments_mentioned text[] NOT NULL DEFAULT '{}',
    created_at                   timestamptz NOT NULL DEFAULT now()
);

-- Table: pending_extractions
CREATE TABLE IF NOT EXISTS pending_extractions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid REFERENCES students(id) ON DELETE SET NULL,
    phone           text,
    source_text     text NOT NULL,
    title           text NOT NULL,
    subject         text NOT NULL,
    deadline        timestamptz NOT NULL,
    short_description text NOT NULL,
    long_summary    text NOT NULL,
    links           text[] NOT NULL DEFAULT '{}',
    notes_or_attachments_mentioned text[] NOT NULL DEFAULT '{}',
    status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','expired')),
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Table: automations_log
CREATE TABLE IF NOT EXISTS automations_log (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     uuid REFERENCES students(id) ON DELETE SET NULL,
    task_id        uuid REFERENCES tasks(id) ON DELETE SET NULL,
    workflow_name  text NOT NULL,
    status         text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','success','failed')),
    payload        jsonb,
    response       jsonb,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- Table: study_packs
CREATE TABLE IF NOT EXISTS study_packs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    source_notes  text NOT NULL,
    flashcards    jsonb NOT NULL DEFAULT '[]',
    quiz          jsonb NOT NULL DEFAULT '[]',
    created_at    timestamptz NOT NULL DEFAULT now()
);
