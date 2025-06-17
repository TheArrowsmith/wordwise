# Text Editor Requirements

## Core Editor Features
- [x] Install and configure Draft.js with basic formatting toolbar
- [x] Set up Draft.js editor with bold, italic, and list formatting options
- [x] Use heroicons for toolbar buttons (bold, italic, list-bullet, numbered-list)
- [x] Typed text in editor has sufficient contrast for readability

## Document Management
- [x] If a document UUID is provided in the URL, load that document and its prompt
- [x] If no existing document UUID is provided, randomly choose a prompt for the user's CEFR level from the `prompts` table
- [x] Display a refresh icon (heroicon `arrows-path`) next to the prompt for selecting new prompts
- [x] Show prompt panel immediately with placeholder loading animation while prompt loads

## Autosave Functionality
- [x] Implement 500ms debounce for autosave using use-debounce
- [x] When first edit is made to a new document, create new document in backend
- [x] Automatically save document content on subsequent edits
- [x] Throttle autosaving to save at most once per second
- [x] Show "Saving..." during save, "Saved" when complete
- [x] Store document metadata: content, prompt_id, created_at, updated_at

## Text Analysis & Feedback
- [x] Add "Analyse" button that requests feedback from `/api/analyze-text`
- [x] Store feedback suggestions in React state (not database)
- [x] Display feedback in right-side panel with category-specific styling:
  - Spelling: yellow underline and `bg-yellow-100 text-yellow-800` badge
  - Grammar: red underline and `bg-red-100 text-red-800` badge  
  - Fluency: blue underline and `bg-blue-100 text-blue-800` badge
  - Clarity: green underline and `bg-green-100 text-green-800` badge
- [x] Show feedback tooltips on hover over highlighted text
- [x] Allow users to apply suggestions with "Apply" buttons
- [x] Remove applied suggestions from feedback list
- [x] Preserve cursor position when applying suggestions

## API Route Specifications
- **File**: `src/app/api/analyze-text/route.ts`
- **Method**: POST
- **Required Body Fields**: `{ text: string, cefrLevel: string, documentId: string }`
- **Response**: Return analysis object with suggestions array (no database storage)
- **Error Handling**: Return 400 if required fields missing

## UI Layout
- **Layout**: Three-column grid with editor taking 2 columns, feedback panel taking 1
- **Prompt Panel**: Always visible with placeholder loading animation during load
- **Feedback Panel**: Right sidebar with empty state when no feedback exists
- **Empty State**: "Click 'Analyse' to get writing feedback"
- **Feedback Items**: Cards showing category, message, explanation, and suggested fix
