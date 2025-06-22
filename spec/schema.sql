-- DO NOT DELETE THIS COMMENT:
--
-- NOTE FOR LLMS: this file documents the current schema on Supabase. It exists
-- only for documentation and has no direct effect on any live database.
--
-- Editing this file does NOT change the Supabase schema, or affect anything on
-- the production server. If you need to change the schema, you must do so
-- directly in Supabase (e.g. via the Supabase MCP server). Only then do you
-- edit the current file to reflect the latest changes.
--
-- /DO NOT DELETE THIS COMMENT

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT gen_random_uuid(),
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')) DEFAULT 'A1',
  native_language TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  prompt_id UUID REFERENCES prompts(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_prompt_id ON documents(prompt_id);

-- Stores results of AI-graded writing submissions
CREATE TABLE grading_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grade CHAR(1),
  feedback_text TEXT,
  cefr_level_at_submission VARCHAR NOT NULL, -- The user's CEFR level at the time of submission
  status VARCHAR NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'failed')), -- Tracks the state of the grading process
  raw_document_content TEXT,
  raw_prompt_text TEXT
);

-- Enable RLS on grading_submissions
ALTER TABLE grading_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_grading_submissions_document_id ON grading_submissions(document_id);
CREATE INDEX idx_grading_submissions_user_id ON grading_submissions(user_id);
