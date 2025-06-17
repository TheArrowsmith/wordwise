Text Editor Implementation

- [x] Install and configure Draft.js with basic formatting toolbar
- [x] Set up Draft.js editor with bold, italic, and list formatting options
- [x] Use heroicons instead of text labels for toolbar buttons (bold, italic, list-bullet, numbered-list)
- [x] Implement 500ms debounce for text input using use-debounce
- [x] Create Next.js API route for OpenAI text analysis
- [x] If a document UUID is provided in the URL, load that document and its prompt.
- [x] If no existing document UUID is provided, randomly choose a prompt for the user's CEFR level from the `prompts` table.
- [x] Display a 'refresh' icon (heroicon `arrows-path`) next to the prompt. Clicking it randomly selects a new prompt from the `prompts` table.
- [x] Autosaving:
  - [x] When I make my first edit to a new, blank document, a new document is saved to the backend.
  - [x] The document is automatically saved again on subsequent edits.
  - [x] To prevent overloading the backend, auto-saving is throttled so we save at most once per second.
  - [x] When an autosave is triggered, the text 'Saving...' appears. When autosave completes, this changes to 'Saved'.
  - [x] Autosave ONLY triggers when actual content changes occur, not in loops
  - [x] Autosave stops after saving and doesn't continue indefinitely
  - [x] Store document metadata: content, prompt_id, created_at, updated_at
- [x] Typed text in textarea is readable (sufficient contrast between text and background)
