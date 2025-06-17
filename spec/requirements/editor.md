Text Editor Implementation

- [ ] Install and configure react-quill with basic formatting toolbar (using Quill directly as required)
- [ ] Set up Quill editor with bold, italic, and list formatting options
- [ ] Implement 500ms debounce for text input using use-debounce
- [ ] Create Next.js API route for OpenAI text analysis
- [ ] Implement error highlighting with red underlines using Quill's formatText
- [ ] Handle OpenAI API response parsing for errors and fluency suggestions
- [ ] Autosaving:
  - [ ] When I make my first edit to the blank editor, a new document is saved to the backend.
  - [ ] The document is automatically saved again on subsequent edits.
  - [ ] To prevent overloading the backend, auto-saving is throttled so we save at most once per second.
  - [ ] When an autosave is triggered, the text 'Saving...' appears. When autosave completes, this changes to 'Saved'.
- [ ] Implement auto-save to Supabase documents table on each debounced change
- [ ] Store document metadata: content, prompt_id, cefr_level, prompt_type, created_at, updated_at
- [ ] Handle API failures gracefully (show "Feedback unavailable" message)
