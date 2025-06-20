import { NextRequest, NextResponse } from 'next/server';
import nspell from 'nspell';
import { readFileSync } from 'fs';
import { join } from 'path';

// Force Node.js runtime for file system access
export const runtime = 'nodejs';
import { retext } from 'retext';
import retextRepeatedWords from 'retext-repeated-words';
import retextSimplify from 'retext-simplify';
import retextIntensify from 'retext-intensify';
import retextPassive from 'retext-passive';
import retextReadability from 'retext-readability';

let spellChecker: ReturnType<typeof nspell> | null = null;

// Initialize spell checker
async function initializeSpellChecker() {
  if (!spellChecker) {
    try {
      // Load dictionary files directly from node_modules
      const dictionaryPath = join(process.cwd(), 'node_modules', 'dictionary-en-us');
      const aff = readFileSync(join(dictionaryPath, 'index.aff'));
      const dic = readFileSync(join(dictionaryPath, 'index.dic'));
      
      spellChecker = nspell({ aff, dic });
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      throw error;
    }
  }
  return spellChecker;
}

interface Suggestion {
  id: string;
  type: 'spelling' | 'grammar' | 'style' | 'readability';
  position: { start: number; end: number };
  text: string;
  message: string;
  suggestions: string[];
  ruleId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { document } = await request.json();

    if (!document || typeof document !== 'object' || !document.type) {
      return NextResponse.json({ error: 'Invalid document format' }, { status: 400 });
    }

    const suggestions: Suggestion[] = [];
    const spell = await initializeSpellChecker();

    const processor = retext()
      .use(retextRepeatedWords)
      .use(retextSimplify)
      .use(retextIntensify)
      .use(retextPassive)
      .use(retextReadability, { age: 18 });

    const traverse = async (node: any, position: number): Promise<number> => {
      if (node.type === 'text') {
        const text = node.text || '';
        
        if (text) {
          // Nspell (Spelling) Analysis
          const words = text.match(/\b[A-Za-z]+\b/g) || [];
          for (const word of words) {
            if (!spell.correct(word)) {
              let match;
              const regex = new RegExp(`\\b${word}\\b`, 'g');
              while ((match = regex.exec(text)) !== null) {
                const wordStartIndex = match.index;
                const absoluteStart = position + wordStartIndex;
                suggestions.push({
                  // FIX: More stable unique key
                  id: `spell-${absoluteStart}-${word}-${match.index}`,
                  type: 'spelling',
                  position: { start: absoluteStart, end: absoluteStart + word.length },
                  text: word,
                  message: `"${word}" may be misspelled.`,
                  suggestions: spell.suggest(word).slice(0, 5),
                  ruleId: 'spelling'
                });
              }
            }
          }
  
          // Retext (Grammar/Style) Analysis
          const file = await processor.process(text);
          file.messages.forEach((message) => {
            if (!message.place || typeof message.place !== 'object') return;
            
            // Handle both Point and Position types
            let startOffset: number | undefined;
            let endOffset: number | undefined;
            
            if ('start' in message.place && 'end' in message.place) {
              // Position type
              startOffset = message.place.start?.offset;
              endOffset = message.place.end?.offset;
            } else if ('offset' in message.place) {
              // Point type - use same offset for start and end
              startOffset = message.place.offset;
              endOffset = message.place.offset;
            }
            
            if (startOffset === undefined || endOffset === undefined) return;

            const start = position + startOffset;
            const end = position + endOffset;
            const messageText = text.slice(startOffset, endOffset);

            if (!messageText.trim()) return;

            let type: 'grammar' | 'style' | 'readability' = 'grammar';
            if (message.source === 'retext-simplify' || message.source === 'retext-intensify') {
              type = 'style';
            } else if (message.source === 'retext-passive' || message.source === 'retext-readability') {
              type = 'readability';
            }
            
            const hasSpellingSuggestion = suggestions.some(s => s.type === 'spelling' && s.position.start <= start && s.position.end >= end);
            if (hasSpellingSuggestion) return;
            
            suggestions.push({
              // FIX: Stable unique key using ruleId, no Math.random()
              id: `${type}-${start}-${end}-${message.ruleId || message.source}`,
              type,
              position: { start, end },
              text: messageText,
              message: message.reason || 'Writing suggestion',
              suggestions: message.expected || [],
              ruleId: String(message.source),
            });
          });
        }
        
        return text.length;
      }

      const openingTagSize = 1;
      let contentSize = 0;

      if (node.content && Array.isArray(node.content)) {
        let childPosition = position + openingTagSize;
        for (const childNode of node.content) {
          const childSize = await traverse(childNode, childPosition);
          contentSize += childSize;
          childPosition += childSize;
        }
      }
      
      const isBlockNode = [
          'doc', 'paragraph', 'heading', 'blockquote', 
          'bulletList', 'orderedList', 'listItem'
      ].includes(node.type);

      if (isBlockNode) {
        return openingTagSize + contentSize + 1;
      } else {
        return openingTagSize;
      }
    };

    // FIX: The traversal now starts on the children of the doc node at position 0,
    // which corrects the consistent +1 offset error.
    let currentPosition = 0;
    if (document.content && Array.isArray(document.content)) {
        for (const topLevelNode of document.content) {
            const nodeSize = await traverse(topLevelNode, currentPosition);
            currentPosition += nodeSize;
        }
    }

    // Sort and limit suggestions
    const sortedSuggestions = suggestions.sort((a, b) => a.position.start - b.position.start);
    
    const spelling = sortedSuggestions.filter(s => s.type === 'spelling');
    const grammar = sortedSuggestions.filter(s => s.type === 'grammar').slice(0, 15);
    const style = sortedSuggestions.filter(s => s.type === 'style').slice(0, 15);
    const readability = sortedSuggestions.filter(s => s.type === 'readability').slice(0, 10);
    
    const limitedSuggestions = [...spelling, ...grammar, ...style, ...readability]
      .sort((a, b) => a.position.start - b.position.start)
      .slice(0, 50);

    return NextResponse.json({ suggestions: limitedSuggestions });

  } catch (error) {
    console.error('Text analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze text',
      suggestions: []
    }, { status: 500 });
  }
} 
