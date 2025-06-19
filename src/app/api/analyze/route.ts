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
    const { text } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const suggestions: Suggestion[] = [];
    
    // Initialize spell checker and check spelling
    try {
      const spell = await initializeSpellChecker();
      
      // Check spelling with nspell
      const words = text.match(/\b[A-Za-z]+\b/g) || [];
      
      for (const word of words) {
        if (!spell.correct(word)) {
          const wordIndex = text.indexOf(word);
          const alternatives = spell.suggest(word).slice(0, 5);
          
          suggestions.push({
            id: `spell-${wordIndex}-${word}`,
            type: 'spelling',
            position: { start: wordIndex, end: wordIndex + word.length },
            text: word,
            message: `"${word}" may be misspelled`,
            suggestions: alternatives,
            ruleId: 'spelling'
          });
        }
      }
    } catch (error) {
      console.error('Spell checking failed, skipping spelling analysis:', error);
      // Continue without spelling suggestions
    }

    // Process with retext plugins (without spell check since we handle it separately)
    const processor = retext()
      .use(retextRepeatedWords)
      .use(retextSimplify)
      .use(retextIntensify)
      .use(retextPassive)
      .use(retextReadability, { age: 18 });

    const file = await processor.process(text);
    
    // Process retext messages
    file.messages.forEach((message) => {
      // Check if message has position information
      if (!message.place || typeof message.place !== 'object') {
        return;
      }
      
      // Handle both Point and Position types
      let start: number | undefined;
      let end: number | undefined;
      
      if ('start' in message.place && 'end' in message.place) {
        // Position type
        start = message.place.start?.offset;
        end = message.place.end?.offset;
      } else if ('offset' in message.place) {
        // Point type - use same offset for start and end
        start = message.place.offset;
        end = message.place.offset;
      }
      
      // Skip messages without proper position information
      if (start === undefined || end === undefined) {
        return;
      }
      
      const messageText = text.slice(start, end);
      
      let type: 'grammar' | 'style' | 'readability' = 'grammar';
      
      // Categorize based on rule source
      if (message.source === 'retext-simplify' || message.source === 'retext-intensify') {
        type = 'style';
      } else if (message.source === 'retext-passive' || message.source === 'retext-readability') {
        type = 'readability';
      }
      
      // Skip if already have spelling suggestion for this position
      const hasSpellingSuggestion = suggestions.some(s => 
        s.type === 'spelling' && 
        s.position.start <= start && 
        s.position.end >= end
      );
      
      if (!hasSpellingSuggestion && messageText.trim()) {
        // Generate unique ID using timestamp and random number to avoid duplicates
        const uniqueId = `${type}-${start}-${end}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        suggestions.push({
          id: uniqueId,
          type,
          position: { start, end },
          text: messageText,
          message: message.reason || message.message || 'Writing suggestion',
          suggestions: message.expected || [],
          ruleId: message.ruleId || message.source
        });
      }
    });

    // Sort suggestions by position and apply limits
    const sortedSuggestions = suggestions.sort((a, b) => a.position.start - b.position.start);
    
    // Apply progressive disclosure limits
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
