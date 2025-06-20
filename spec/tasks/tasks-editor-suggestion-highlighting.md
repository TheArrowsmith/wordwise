### Task List

## Relevant Files

-   `src/components/editor/WritingEditor.tsx` - Verify `onUpdate` sends JSON.
-   `src/contexts/SuggestionContext.tsx` - Verify `analyzText` sends JSON.
-   `src/app/api/analyze/route.ts` - This file will be **completely replaced** to ensure correct state scoping and logic.

### Notes

-   This is the definitive plan. The most critical part is ensuring all the logic and variables are placed **inside** the `export async function POST(...)` block as shown in the code snippet. This prevents state from leaking between serverless function invocations.

## Tasks

-   [ ] 1.0 **Verify Client-Side Logic:** Ensure the editor and context are sending the full ProseMirror JSON document.
    -   [ ] 1.1 In `src/components/editor/WritingEditor.tsx`, confirm the `onUpdate` handler calls `editor.getJSON()` and passes the result to `analyzText`.
    -   [ ] 1.2 In `src/contexts/SuggestionContext.tsx`, confirm the `fetch` call's body is `JSON.stringify({ document: documentJSON })`.

-   [ ] 2.0 **Completely Replace the Backend API Logic:** To eliminate any possibility of error from old code, replace the entire content of `/api/analyze/route.ts` with the correct, self-contained implementation below.

    -   [ ] 2.1 Open the file `src/app/api/analyze/route.ts`.
    -   [ ] 2.2 Delete everything in the file.
    -   [ ] 2.3 **Copy and paste the entire code block below** into the now-empty file. This contains all necessary imports and the correct logic scoped properly.

        ```typescript
        // --- Start: Paste this entire block into /api/analyze/route.ts ---

        import { NextRequest, NextResponse } from 'next/server';
        import nspell from 'nspell';
        import { readFileSync } from 'fs';
        import { join } from 'path';
        import { retext } from 'retext';
        import retextRepeatedWords from 'retext-repeated-words';
        import retextSimplify from 'retext-simplify';
        import retextIntensify from 'retext-intensify';
        import retextPassive from 'retext-passive';
        import retextReadability from 'retext-readability';
        import { Suggestion } from '@/types/suggestion';

        // This module-level cache for the spell checker is safe and improves performance.
        let spellChecker: ReturnType<typeof nspell> | null = null;
        
        async function initializeSpellChecker() {
          if (!spellChecker) {
            const dictionaryPath = join(process.cwd(), 'node_modules', 'dictionary-en-us');
            const aff = readFileSync(join(dictionaryPath, 'index.aff'));
            const dic = readFileSync(join(dictionaryPath, 'index.dic'));
            spellChecker = nspell({ aff, dic });
          }
          return spellChecker;
        }
        
        // The main request handler. All logic is contained within this function.
        export async function POST(request: NextRequest) {
          try {
            const { document } = await request.json();
            if (!document || typeof document !== 'object') {
              return NextResponse.json({ error: 'ProseMirror document is required' }, { status: 400 });
            }
        
            // CRITICAL: All request-specific state is declared HERE, inside the handler.
            const suggestions: Suggestion[] = [];
            const spell = await initializeSpellChecker();
            const retextProcessor = retext()
              .use(retextRepeatedWords)
              .use(retextSimplify)
              .use(retextIntensify)
              .use(retextPassive)
              .use(retextReadability, { age: 18 });
        
            // The traversal function is defined within the request scope,
            // giving it access to the request's 'suggestions' array.
            async function traverse(node: any, position: number): Promise<number> {
              if (node.type === 'text' && node.text) {
                const textSegment = node.text;
            
                // Nspell analysis (synchronous)
                const wordRegex = /\b[A-Za-z]+\b/g;
                let match;
                while ((match = wordRegex.exec(textSegment)) !== null) {
                  const word = match[0];
                  if (!spell.correct(word)) {
                    const absoluteStartIndex = position + match.index;
                    suggestions.push({
                      id: `spell-${absoluteStartIndex}`, type: 'spelling',
                      position: { start: absoluteStartIndex, end: absoluteStartIndex + word.length },
                      text: word, message: `"${word}" may be misspelled`,
                      suggestions: spell.suggest(word).slice(0, 5), ruleId: 'spelling'
                    });
                  }
                }
            
                // Retext analysis (asynchronous)
                const file = await retextProcessor.process(textSegment);
                file.messages.forEach(message => {
                  if (!message.place || !message.place.start || !message.place.end) return;
                  const { start, end } = { start: message.place.start.offset, end: message.place.end.offset };
                  const absoluteStartIndex = position + start;
                  let type: Suggestion['type'] = 'grammar';
                  if (message.source === 'retext-simplify' || message.source === 'retext-intensify') type = 'style';
                  if (message.source === 'retext-passive' || message.source === 'retext-readability') type = 'readability';
                  suggestions.push({
                    id: `${type}-${absoluteStartIndex}`, type,
                    position: { start: absoluteStartIndex, end: position + end },
                    text: textSegment.slice(start, end), message: message.reason || '',
                    suggestions: message.expected || [], ruleId: message.ruleId || message.source
                  });
                });
            
                return textSegment.length;
              }
        
              if (node.type === 'hard_break') return 1;
        
              if (node.content && Array.isArray(node.content)) {
                let contentPosition = position + 1;
                for (const child of node.content) {
                  const childSize = await traverse(child, contentPosition);
                  contentPosition += childSize;
                }
                return (contentPosition - position) + 1;
              }
        
              return 0;
            }
        
            // Execute the traversal for this specific request.
            await traverse(document, 0);
        
            const sortedSuggestions = suggestions.sort((a, b) => a.position.start - b.position.start);
        
            return NextResponse.json({ suggestions: sortedSuggestions });
          } catch (error) {
            console.error('Text analysis error:', error);
            return NextResponse.json({ error: 'Failed to analyze text' }, { status: 500 });
          }
        }
        
        // --- End: Paste this entire block into /api/analyze/route.ts ---
        ```
