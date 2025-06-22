'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Suggestion, SuggestionCounts, AnalysisResponse } from '@/types/suggestion';

interface SuggestionContextType {
  suggestions: Suggestion[];
  suggestionCounts: SuggestionCounts;
  isLoading: boolean;
  hoveredSuggestion: string | null;
  editor: Editor | null;
  setSuggestions: (suggestions: Suggestion[]) => void;
  setIsLoading: (loading: boolean) => void;
  setHoveredSuggestion: (id: string | null) => void;
  analyzText: (document: object) => Promise<void>;
  cancelAnalysis: () => void;
  registerEditor: (editor: Editor) => void;
  applySuggestion: (suggestionId: string) => void;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export function SuggestionProvider({ children }: { children: React.ReactNode }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const suggestionCounts: SuggestionCounts = {
    spelling: suggestions.filter(s => s.type === 'spelling').length,
    grammar: suggestions.filter(s => s.type === 'grammar').length,
    style: suggestions.filter(s => s.type === 'style').length,
    readability: suggestions.filter(s => s.type === 'readability').length,
  };

  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const registerEditor = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);
  }, []);

  const applySuggestion = useCallback((suggestionId: string) => {
    if (!editor) return;

    const suggestionToApply = suggestions.find(s => s.id === suggestionId);
    if (!suggestionToApply || suggestionToApply.suggestions.length === 0) return;

    const { position } = suggestionToApply;
    const replacementText = suggestionToApply.suggestions[0];

    // Apply the change in the editor
    editor.chain().focus()
      .insertContentAt({ from: position.start, to: position.end }, replacementText)
      .run();

    // Remove the applied suggestion from the list
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, [editor, suggestions]);

  const analyzText = useCallback(async (document: object) => {
    if (!document || Object.keys(document).length === 0) {
      setSuggestions([]);
      return;
    }

    // Cancel previous request
    cancelAnalysis();

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ document }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data: AnalysisResponse = await response.json();
      
      if (data.error) {
        console.error('Analysis error:', data.error);
        setSuggestions([]);
      } else {
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Failed to analyze text:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [cancelAnalysis]);

  return (
    <SuggestionContext.Provider
      value={{
        suggestions,
        suggestionCounts,
        isLoading,
        hoveredSuggestion,
        editor,
        setSuggestions,
        setIsLoading,
        setHoveredSuggestion,
        analyzText,
        cancelAnalysis,
        registerEditor,
        applySuggestion,
      }}
    >
      {children}
    </SuggestionContext.Provider>
  );
}

export function useSuggestions() {
  const context = useContext(SuggestionContext);
  if (context === undefined) {
    throw new Error('useSuggestions must be used within a SuggestionProvider');
  }
  return context;
} 