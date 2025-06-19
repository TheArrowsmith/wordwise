'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Suggestion, SuggestionCounts, AnalysisResponse } from '@/types/suggestion';

interface SuggestionContextType {
  suggestions: Suggestion[];
  suggestionCounts: SuggestionCounts;
  isLoading: boolean;
  hoveredSuggestion: string | null;
  setSuggestions: (suggestions: Suggestion[]) => void;
  setIsLoading: (loading: boolean) => void;
  setHoveredSuggestion: (id: string | null) => void;
  analyzText: (text: string) => Promise<void>;
  cancelAnalysis: () => void;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export function SuggestionProvider({ children }: { children: React.ReactNode }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);
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

  const analyzText = useCallback(async (text: string) => {
    if (!text.trim()) {
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
        body: JSON.stringify({ text }),
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
        setSuggestions,
        setIsLoading,
        setHoveredSuggestion,
        analyzText,
        cancelAnalysis,
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