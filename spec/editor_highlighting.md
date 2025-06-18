# Draft.js Text Editor with Programmatic Highlighting - Implementation Guide

(This was generated from the highlighting PoC that I finally managed to make work.)

## Core Requirements

- [ ] **Use Draft.js** - it's specifically designed for programmatic rich text manipulation
- [ ] **Two-panel layout**: 2/3 width text editor on left, 1/3 width control panel on right
- [ ] **Highlight by offset/length**: Input fields for 0-based character offset and length, plus color picker
- [ ] **Individual replace per highlight**: Each highlight gets its own text input and replace button in the sidebar
- [ ] **Auto-removal on content change**: If ANY character within a highlighted range changes, remove that highlight immediately
- [ ] **Position tracking**: Highlights must move correctly when text is inserted/deleted before them

## Draft.js Architecture

- [ ] **Use entities for highlights**: Create Draft.js entities with `'HIGHLIGHT'` type and store color/ID data
- [ ] **Use CompositeDecorator**: Create decorator with strategy function to find highlight entities and component to render them
- [ ] **Entity strategy function**: Use `contentBlock.findEntityRanges()` to locate highlight entities
- [ ] **Render component**: Simple span with `backgroundColor` style from entity data

```typescript
const decorator = new CompositeDecorator([{
  strategy: findHighlightEntities,
  component: HighlightSpan,
}]);
```

## Critical Draft.js Pitfalls

### Block Keys and Selections
- [ ] **Never use hardcoded block keys**: Always get actual block key with `contentState.getFirstBlock().getKey()`
- [ ] **SelectionState requires valid block key**: `SelectionState.createEmpty(blockKey)` not `SelectionState.createEmpty('0')`
- [ ] **This prevents "Cannot read properties of undefined (reading 'getCharacterList')" errors**

### Undo Stack Management
- [ ] **Use `EditorState.set()` for highlight operations**: This bypasses the undo stack
- [ ] **Never use `EditorState.push()` for highlights**: This would make highlights undoable with Ctrl+Z
- [ ] **Only content changes should be undoable**: User typing, pasting, etc.

```typescript
// Wrong - adds to undo stack
const newState = EditorState.push(editorState, newContent, 'apply-entity');

// Correct - bypasses undo stack  
const newState = EditorState.set(editorState, { currentContent: newContent });
```

## State Management

- [ ] **Track highlights in React state**: Array of `{id, from, to, color}` objects
- [ ] **Separate replace text inputs**: Object mapping highlight ID to replacement text
- [ ] **Use useRef for editor instance**: Not required but helps with debugging

## Position Tracking Logic

### Text Change Detection
- [ ] **Compare old vs new plain text**: `oldContentState.getPlainText()` vs `newContentState.getPlainText()`
- [ ] **Calculate change position**: `currentSelection.getStartOffset() - Math.max(0, textLengthDiff)`
- [ ] **Determine text length difference**: `newText.length - oldText.length`

### Highlight Position Updates
- [ ] **Text inserted/deleted before highlight**: Shift both `from` and `to` by the text length difference
- [ ] **Text changed within highlight**: Remove the highlight entirely
- [ ] **Text changed after highlight**: No position change needed
- [ ] **Validate bounds**: Ensure `from >= 0`, `to <= textLength`, `from < to`

## Critical Edge Case: Smart Highlight Removal

### The "Remaining Characters" Problem
- [ ] **Problem**: When text is inserted in a highlight, naive removal only clears the original range
- [ ] **Solution**: Calculate the full affected range after text insertion
- [ ] **Formula**: `Math.max(originalTo, originalTo + textLengthDiff)` 
- [ ] **Remove entities from entire affected range**: This prevents leftover highlighting

```typescript
// Calculate full range that might be affected
const affectedEnd = Math.max(highlight.to, highlight.to + textLengthDiff);
highlightsToRemove.push({ 
  id: highlight.id, 
  from: highlight.from, 
  to: Math.min(affectedEnd, newText.length)
});
```

## Cursor Position Preservation

- [ ] **Save selection before operations**: `const currentSelection = editorState.getSelection()`
- [ ] **Restore after operations**: `EditorState.forceSelection(newEditorState, currentSelection)`
- [ ] **Apply to all highlight operations**: Add, remove, replace, auto-remove
- [ ] **Never call `.focus()` in chains**: This moves cursor unnecessarily

## Entity Management

### Adding Highlights
- [ ] **Create entity first**: `contentState.createEntity('HIGHLIGHT', 'MUTABLE', {color, id})`
- [ ] **Get entity key**: `contentStateWithEntity.getLastCreatedEntityKey()`
- [ ] **Apply to range**: `Modifier.applyEntity(contentState, selection, entityKey)`

### Removing Highlights
- [ ] **Apply null entity**: `Modifier.applyEntity(contentState, selection, null)`
- [ ] **Use correct range**: Must account for text changes that happened

### Bounds Checking
- [ ] **Validate selection ranges**: Ensure `anchorOffset < focusOffset`
- [ ] **Clamp to text bounds**: `Math.max(0, Math.min(offset, textLength))`
- [ ] **Skip invalid selections**: Don't apply operations if start >= end

## Content Change Handler Structure

- [ ] **Early return if no content change**: Compare `oldContentState !== newContentState`
- [ ] **Process each highlight individually**: Loop through highlights array
- [ ] **Collect highlights to remove**: Don't modify arrays during iteration
- [ ] **Apply entity removals in batch**: Single content state update
- [ ] **Update React state last**: After Draft.js state is consistent

## UI/UX Requirements

### Control Panel
- [ ] **Number inputs for offset/length**: With placeholder text explaining 0-based indexing
- [ ] **Color picker**: HTML color input
- [ ] **Validation**: Alert for invalid offset/length values
- [ ] **Clear inputs after adding**: Reset offset/length fields

### Highlight List
- [ ] **Show each highlight as card**: Include color swatch, position info, remove button
- [ ] **Individual replace inputs**: Text input + replace button per highlight
- [ ] **Disable replace when empty**: Button disabled if no replacement text
- [ ] **Clean up on removal**: Remove replace text from state when highlight removed

### Editor Styling
- [ ] **Proper container sizing**: Full height with border, padding, white background
- [ ] **Focus handling**: Editor should be focusable and show cursor
- [ ] **Placeholder text**: Helpful instructions for user

## Testing Scenarios

- [ ] **Type before highlight**: Highlight should move correctly, cursor stays in place
- [ ] **Type within highlight**: Highlight disappears completely, no leftover characters
- [ ] **Paste within highlight**: Works regardless of paste length
- [ ] **Multiple highlights**: Operations on one don't affect others
- [ ] **Edge positions**: Highlights at start/end of text
- [ ] **Empty document**: Adding highlights to empty editor
- [ ] **Undo/redo**: Should only affect text content, not highlights
- [ ] **Replace functionality**: Each highlight can be individually replaced
- [ ] **Color variations**: Multiple highlight colors work correctly

## Common Mistakes to Avoid

- [ ] **Don't create custom ProseMirror plugins**: Draft.js entities handle this better
- [ ] **Don't use string literals for block keys**: Always get real keys from content state
- [ ] **Don't forget bounds checking**: Invalid ranges cause hard-to-debug errors
- [ ] **Don't modify state during iteration**: Collect changes first, apply after
- [ ] **Don't use EditorState.push for highlights**: This makes them undoable
- [ ] **Don't assume single-block content**: Even though this example uses one block, be defensive

## Key Implementation Flow

1. **Initialize**: Create CompositeDecorator and EditorState with initial content
2. **Add Highlight**: Create entity → Apply to selection → Update React state
3. **Text Change**: Detect changes → Update positions → Remove invalid highlights → Clean entities
4. **Remove Highlight**: Remove from React state → Remove entity from content
5. **Replace Text**: Replace content → Remove highlight → Update state

## Dependencies Required

```json
{
  "draft-js": "^0.11.7",
  "@types/draft-js": "^0.11.12"
}
```

This checklist ensures a robust implementation that handles all the edge cases discovered during development.
