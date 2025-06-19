'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, arrow } from '@floating-ui/react';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { SUGGESTION_LABELS, SUGGESTION_COLORS } from '@/types/suggestion';

interface SuggestionTooltipProps {
  children: React.ReactNode;
}

export function SuggestionTooltip({ children }: SuggestionTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { suggestions, hoveredSuggestion } = useSuggestions();
  const arrowRef = useRef<HTMLDivElement>(null);
  
  const { refs, floatingStyles } = useFloating({
    open: isVisible,
    onOpenChange: setIsVisible,
    middleware: [
      offset(8),
      flip(),
      shift({ padding: 8 }),
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Find the current suggestion being hovered
  const currentSuggestion = suggestions.find(s => s.id === hoveredSuggestion);

  useEffect(() => {
    const handleMouseOver = (event: Event) => {
      const target = event.target as HTMLElement;
      const suggestionId = target.getAttribute('data-suggestion-id');
      
      if (suggestionId) {
        refs.setReference(target);
        setIsVisible(true);
      }
    };

    const handleMouseOut = (event: Event) => {
      const target = event.target as HTMLElement;
      const suggestionId = target.getAttribute('data-suggestion-id');
      
      if (suggestionId) {
        setTimeout(() => {
          setIsVisible(false);
        }, 100); // Small delay to prevent flickering
      }
    };

    const container = document.querySelector('.ProseMirror');
    if (container) {
      container.addEventListener('mouseover', handleMouseOver);
      container.addEventListener('mouseout', handleMouseOut);
      
      return () => {
        container.removeEventListener('mouseover', handleMouseOver);
        container.removeEventListener('mouseout', handleMouseOut);
      };
    }
  }, [refs]);

  if (!isVisible || !currentSuggestion) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="z-50 max-w-xs p-3 bg-white border border-gray-200 rounded-lg shadow-lg"
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: SUGGESTION_COLORS[currentSuggestion.type] }}
            />
            <span className="text-sm font-medium text-gray-900">
              {SUGGESTION_LABELS[currentSuggestion.type]}
            </span>
          </div>
          
          <div className="text-sm text-gray-700">
            {currentSuggestion.message}
          </div>
          
          {currentSuggestion.text && (
            <div className="text-xs text-gray-500">
              Original: &quot;{currentSuggestion.text}&quot;
            </div>
          )}
          
          {currentSuggestion.suggestions.length > 0 && (
            <div className="text-xs text-gray-600">
              <div className="font-medium">Suggestions:</div>
              <div className="mt-1">
                {currentSuggestion.suggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="text-green-600">
                    → {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div
          ref={arrowRef}
          className="absolute w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45"
          style={{ 
            left: '50%', 
            transform: 'translateX(-50%) rotate(45deg)',
            bottom: '-4px'
          }}
        />
      </div>
    </>
  );
} 