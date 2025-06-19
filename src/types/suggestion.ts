export interface Suggestion {
  id: string;
  type: 'spelling' | 'grammar' | 'style' | 'readability';
  position: { start: number; end: number };
  text: string;
  message: string;
  suggestions: string[];
  ruleId?: string;
}

export interface SuggestionCounts {
  spelling: number;
  grammar: number;
  style: number;
  readability: number;
}

export interface AnalysisResponse {
  suggestions: Suggestion[];
  error?: string;
}

export const SUGGESTION_COLORS = {
  spelling: '#dc2626',    // red-600
  grammar: '#2563eb',     // blue-600
  style: '#16a34a',       // green-600
  readability: '#9333ea'  // purple-600
} as const;

export const SUGGESTION_LABELS = {
  spelling: 'Spelling',
  grammar: 'Clarity',
  style: 'Conciseness',
  readability: 'Readability'
} as const;

export const SUGGESTION_PRIORITY = {
  spelling: 1,
  grammar: 2,
  style: 3,
  readability: 4
} as const; 