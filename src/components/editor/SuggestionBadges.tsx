'use client';

import React from 'react';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { SUGGESTION_LABELS, SUGGESTION_COLORS } from '@/types/suggestion';

export function SuggestionBadges() {
  const { suggestionCounts, isLoading } = useSuggestions();

  const badges = [
    { type: 'spelling' as const, count: suggestionCounts.spelling },
    { type: 'grammar' as const, count: suggestionCounts.grammar },
    { type: 'style' as const, count: suggestionCounts.style },
    { type: 'readability' as const, count: suggestionCounts.readability },
  ].filter(badge => badge.count > 0);

  if (badges.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      {isLoading && (
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <div className="animate-spin h-3 w-3 border border-gray-300 rounded-full border-t-transparent"></div>
          <span>Analyzing...</span>
        </div>
      )}
      {badges.map(({ type, count }) => (
        <div
          key={type}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
          style={{ backgroundColor: SUGGESTION_COLORS[type] }}
        >
          {SUGGESTION_LABELS[type]} {count}
        </div>
      ))}
    </div>
  );
} 