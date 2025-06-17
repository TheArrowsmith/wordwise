// CEFR level union type
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Feedback category union type
export type FeedbackCategory = 'spelling' | 'grammar' | 'fluency' | 'clarity';

// Database table types
export interface Profile {
  id: string;
  cefr_level: CEFRLevel;
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
