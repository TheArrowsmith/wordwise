import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Suggestion, SUGGESTION_COLORS, SUGGESTION_PRIORITY } from '@/types/suggestion';

export interface SuggestionExtensionOptions {
  suggestions: Suggestion[];
  onHover?: (suggestionId: string | null) => void;
}

const suggestionPluginKey = new PluginKey('suggestions');

export const SuggestionExtension = Extension.create<SuggestionExtensionOptions>({
  name: 'suggestions',

  addOptions() {
    return {
      suggestions: [],
      onHover: undefined,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          suggestionType: {
            default: null,
            parseHTML: element => element.getAttribute('data-suggestion-type'),
            renderHTML: attributes => {
              if (!attributes.suggestionType) {
                return {};
              }
              return {
                'data-suggestion-type': attributes.suggestionType,
              };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: suggestionPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr) => {
            // Get current suggestions from options
            const suggestions = this.options.suggestions;
            
            if (!suggestions.length) {
              return DecorationSet.empty;
            }

            // Create decorations for suggestions
            const decorations: Decoration[] = [];
            
            // Group overlapping suggestions and show highest priority
            const processedRanges = new Set<string>();
            
            suggestions.forEach(suggestion => {
              const { start, end } = suggestion.position;
              const rangeKey = `${start}-${end}`;
              
              // Skip if this range is already processed by higher priority suggestion
              if (processedRanges.has(rangeKey)) {
                return;
              }
              
              // Check for overlapping suggestions
              const overlappingSuggestions = suggestions.filter(s => 
                s.position.start < end && s.position.end > start
              );
              
              // Find highest priority suggestion for this range
              const highestPriority = overlappingSuggestions.reduce((highest, current) => {
                const currentPriority = SUGGESTION_PRIORITY[current.type];
                const highestPriority = SUGGESTION_PRIORITY[highest.type];
                return currentPriority < highestPriority ? current : highest;
              }, suggestion);
              
              // Mark all overlapping ranges as processed
              overlappingSuggestions.forEach(s => {
                processedRanges.add(`${s.position.start}-${s.position.end}`);
              });
              
              // Create decoration for highest priority suggestion
              const color = SUGGESTION_COLORS[highestPriority.type];
              
              const decoration = Decoration.inline(
                highestPriority.position.start,
                highestPriority.position.end,
                {
                  style: `text-decoration-line: underline; text-decoration-style: dotted; text-decoration-color: ${color};`,
                  'data-suggestion-id': highestPriority.id,
                  'data-suggestion-type': highestPriority.type,
                },
                {
                  suggestionId: highestPriority.id,
                  suggestionType: highestPriority.type,
                }
              );
              
              decorations.push(decoration);
            });
            
            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleDOMEvents: {
            mouseover: (view, event) => {
              const target = event.target as HTMLElement;
              const suggestionId = target.getAttribute('data-suggestion-id');
              
              if (suggestionId && this.options.onHover) {
                this.options.onHover(suggestionId);
              }
              
              return false;
            },
            mouseout: (view, event) => {
              const target = event.target as HTMLElement;
              const suggestionId = target.getAttribute('data-suggestion-id');
              
              if (suggestionId && this.options.onHover) {
                this.options.onHover(null);
              }
              
              return false;
            },
          },
        },
      }),
    ];
  },


}); 
