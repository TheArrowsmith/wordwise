import { User } from '@supabase/supabase-js';

// CEFR level union type
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Feedback category union type
export type FeedbackCategory = 'spelling' | 'grammar' | 'fluency' | 'clarity';

export type FeedbackType = 'spelling' | 'grammar' | 'fluency';

// Export User type for convenience
export type { User };

// Draft.js related types
export interface DraftJSContentBlock {
  getText(): string;
}

export interface DraftJSCallback {
  (start: number, end: number): void;
}

export interface FeedbackSpanProps {
  children: Array<{ props: { text: string } }>;
  start: number;
}

// API response types
export interface AnalyzedSuggestion {
  category?: string;
  message?: string;
  explanation?: string;
  suggested_fix?: string;
  suggestions?: string[];
  offset?: number;
  length?: number;
}

// Document transformation types  
export interface DocumentFromDB {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  prompt_id: string;
  prompts?: Prompt | Prompt[] | null;
}

export interface EditorBlock {
  text?: string;
}

// Database table types
export interface Profile {
  id: string;
  cefr_level: CEFRLevel;
  native_language: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prompt {
  id: string;
  text: string;
  cefr_level: CEFRLevel;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  content: string;
  prompt_id: string;
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  document_id: string;
  category: FeedbackCategory;
  message: string;
  explanation?: string;
  offset: number;
  length: number;
  fix?: string;
  rule?: string;
  created_at: string;
}

// Extended types for joins and relationships
export interface DocumentWithPrompt extends Document {
  prompts?: Prompt | null;
}

export interface DocumentWithPromptPartial extends Document {
  prompts?: {
    cefr_level: CEFRLevel;
    text: string;
  } | null;
} 
