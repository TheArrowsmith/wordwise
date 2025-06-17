-- WordWise Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Create custom types
CREATE TYPE cefr_level AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE error_category AS ENUM ('SPELLING', 'GRAMMAR', 'PUNCTUATION', 'STYLE');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  cefr_level cefr_level DEFAULT 'B1',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prompts table
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  cefr_level cefr_level NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  prompt_id UUID REFERENCES prompts(id),
  cefr_level cefr_level NOT NULL,
  prompt_type TEXT, -- e.g., 'narrative', 'argumentative'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Errors table
CREATE TABLE errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  category error_category NOT NULL,
  message TEXT,
  explanation TEXT,
  offset INTEGER,
  length INTEGER,
  suggestions TEXT[], -- Array of suggested corrections
  rule_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_errors_document_id ON errors(document_id);
CREATE INDEX idx_prompts_cefr_level ON prompts(cefr_level);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE errors ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR ALL USING (auth.uid() = id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents
  FOR ALL USING (auth.uid() = user_id);

-- Errors policies
CREATE POLICY "Users can view errors for own documents" ON errors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = errors.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- Prompts are readable by everyone (no user-specific data)
CREATE POLICY "Prompts are readable by authenticated users" ON prompts
  FOR SELECT USING (auth.role() = 'authenticated');

-- Function to automatically update updated_at on documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 
