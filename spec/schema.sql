CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')) DEFAULT 'B1',
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE prompts (
  id UUID PRIMARY KEY,
  text TEXT NOT NULL,
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  prompt_id UUID REFERENCES prompts(id),
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  prompt_type TEXT, -- e.g., 'narrative', 'argumentative'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE errors (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  category TEXT CHECK (category IN ('SPELLING', 'GRAMMAR', 'PUNCTUATION', 'STYLE')),
  message TEXT,
  explanation TEXT,
  offset INTEGER,
  length INTEGER,
  suggestions TEXT[], -- Array of suggested corrections
  rule_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  error_id UUID REFERENCES errors(id),
  action TEXT CHECK (action IN ('accepted', 'ignored')),
  created_at TIMESTAMP DEFAULT NOW()
);
