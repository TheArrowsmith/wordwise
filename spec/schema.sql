CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT gen_random_uuid(),
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')) DEFAULT 'B1',
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

CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id)  ON DELETE CASCADE,
  category TEXT CHECK (category IN ('SPELLING', 'GRAMMAR', 'PUNCTUATION', 'STYLE', 'FLUENCY')),
  message TEXT,
  explanation TEXT,
  "offset" INTEGER,
  length INTEGER,
  suggestions TEXT[], -- Array of suggested corrections
  rule TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suggestions_document_id ON suggestions(document_id);

