'use client';

import React, { useState } from 'react';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { SUGGESTION_LABELS, SUGGESTION_COLORS } from '@/types/suggestion';
import { SuggestionBadges } from './SuggestionBadges';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const SUGGESTION_ICONS = {
  spelling: ExclamationTriangleIcon,
  grammar: InformationCircleIcon,
  style: LightBulbIcon,
  readability: InformationCircleIcon,
};

export function SuggestionPanel() {
  const { suggestions, hoveredSuggestion, setHoveredSuggestion, isLoading, applySuggestion } = useSuggestions();
  const [showAll, setShowAll] = useState(false);
  
  // Apply progressive disclosure limits
  const displayedSuggestions = showAll ? suggestions : suggestions.slice(0, 50);
  const hasMoreSuggestions = suggestions.length > 50;

  if (suggestions.length === 0) {
    return (
      <div className="w-80 bg-white shadow-sm flex flex-col">
        <div className="bg-[var(--primary-color)] text-white p-4">
          <h2 className="text-lg font-semibold">Feedback</h2>
          <p className="text-sm text-white/80 mt-1">0 suggestions found</p>
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <CheckCircleIcon className="h-12 w-12 text-[var(--secondary-color)] mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No writing suggestions found
          </h3>
          <p className="text-sm text-gray-500">
            Keep typing to see feedback!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white shadow-sm flex flex-col">
      <div className="bg-[var(--primary-color)] text-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Feedback
          </h2>
          {isLoading && (
            <div className="animate-spin h-4 w-4 border border-white/30 rounded-full border-t-transparent"></div>
          )}
        </div>
        <p className="text-sm text-white/80 mt-1">
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
        </p>
      </div>
      <div className="p-4 border-b border-gray-200">
        <SuggestionBadges />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {displayedSuggestions.map((suggestion) => {
            const Icon = SUGGESTION_ICONS[suggestion.type];
            const isHovered = hoveredSuggestion === suggestion.id;
            
            return (
              <div
                key={suggestion.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isHovered 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onMouseEnter={() => setHoveredSuggestion(suggestion.id)}
                onMouseLeave={() => setHoveredSuggestion(null)}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: SUGGESTION_COLORS[suggestion.type] }}
                  >
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span 
                      className="text-xs font-semibold"
                      style={{ color: SUGGESTION_COLORS[suggestion.type] }}
                    >
                      {SUGGESTION_LABELS[suggestion.type]}
                    </span>
                    
                    <p className="text-sm text-gray-700 mt-1">
                      {suggestion.message}
                    </p>
                    
                    {suggestion.suggestions.length > 0 && (
                      <button
                        onClick={() => applySuggestion(suggestion.id)}
                        className="mt-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors w-full text-left"
                      >
                        Apply suggestion: <span className="font-semibold">{suggestion.suggestions[0]}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {hasMoreSuggestions && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full p-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
            >
              Show {suggestions.length - 50} more suggestions
            </button>
          )}
          
          {showAll && hasMoreSuggestions && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full p-3 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
            >
              Show fewer suggestions
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 