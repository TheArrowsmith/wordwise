"use client";

import React, { useState, useRef, useCallback } from 'react';
import { 
  Editor, 
  EditorState, 
  ContentState, 
  SelectionState,
  Modifier,
  CompositeDecorator,
  ContentBlock
} from 'draft-js';
import dynamic from 'next/dynamic';

interface HighlightState {
  id: number;
  from: number;
  to: number;
  color: string;
}

// Highlight component for rendering
const HighlightSpan: React.FC<{ 
  children: React.ReactNode; 
  contentState: ContentState;
  entityKey: string;
}> = ({ children, contentState, entityKey }) => {
  const entity = contentState.getEntity(entityKey);
  const { color } = entity.getData();
  
  return (
    <span style={{ backgroundColor: color, borderRadius: '2px' }}>
      {children}
    </span>
  );
};

// Strategy function to find highlight entities
const findHighlightEntities = (
  contentBlock: ContentBlock,
  callback: (start: number, end: number) => void,
  contentState: ContentState
) => {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        contentState.getEntity(entityKey).getType() === 'HIGHLIGHT'
      );
    },
    callback
  );
};

const TextEditor = () => {
  const [highlights, setHighlights] = useState<HighlightState[]>([]);
  const [highlightOffset, setHighlightOffset] = useState('');
  const [highlightLength, setHighlightLength] = useState('');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [replaceTexts, setReplaceTexts] = useState<{[key: number]: string}>({});
  
  // Create decorator for highlights
  const decorator = new CompositeDecorator([
    {
      strategy: findHighlightEntities,
      component: HighlightSpan,
    },
  ]);
  
  const [editorState, setEditorState] = useState(() =>
    EditorState.createWithContent(
      ContentState.createFromText(
        "Click here to start typing. Try adding some text, then use the controls on the right to highlight text or replace portions of it. For example, type 'Hello world' and then highlight from offset 0 with length 5 to highlight 'Hello'."
      ),
      decorator
    )
  );

  const editorRef = useRef<Editor>(null);

  const addHighlight = () => {
    const offset = parseInt(highlightOffset);
    const length = parseInt(highlightLength);
    
    if (isNaN(offset) || isNaN(length) || offset < 0 || length <= 0) {
      alert('Invalid offset or length');
      return;
    }

    const contentState = editorState.getCurrentContent();
    const text = contentState.getPlainText();
    
    if (offset + length > text.length) {
      alert('Invalid offset or length');
      return;
    }

    const newHighlight: HighlightState = {
      id: Date.now(),
      from: offset,
      to: offset + length,
      color: highlightColor,
    };

    // Create entity for the highlight
    const contentStateWithEntity = contentState.createEntity(
      'HIGHLIGHT',
      'MUTABLE',
      { color: highlightColor, id: newHighlight.id }
    );
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();

    // Get the first (and typically only) block
    const firstBlock = contentState.getFirstBlock();
    const blockKey = firstBlock.getKey();

    // Create selection for the range to highlight
    const selection = SelectionState.createEmpty(blockKey).merge({
      anchorOffset: offset,
      focusOffset: offset + length,
    });

    // Apply the entity to the selected range
    const newContentState = Modifier.applyEntity(
      contentStateWithEntity,
      selection,
      entityKey
    );

    // Update editor state while preserving current cursor position
    const currentSelection = editorState.getSelection();
    const newEditorState = EditorState.set(editorState, {
      currentContent: newContentState,
    });
    
    // Restore original selection
    setEditorState(EditorState.forceSelection(newEditorState, currentSelection));
    setHighlights(prev => [...prev, newHighlight]);
    setHighlightOffset('');
    setHighlightLength('');
  };

  const removeHighlight = (id: number) => {
    const highlight = highlights.find(h => h.id === id);
    if (!highlight) return;

    const contentState = editorState.getCurrentContent();
    const currentSelection = editorState.getSelection();
    
    // Get the first block
    const firstBlock = contentState.getFirstBlock();
    const blockKey = firstBlock.getKey();
    
    // Create selection for the highlight range
    const selection = SelectionState.createEmpty(blockKey).merge({
      anchorOffset: highlight.from,
      focusOffset: highlight.to,
    });

    // Remove entity from the range
    const newContentState = Modifier.applyEntity(
      contentState,
      selection,
      null
    );

    const newEditorState = EditorState.set(editorState, {
      currentContent: newContentState,
    });

    // Restore original selection
    setEditorState(EditorState.forceSelection(newEditorState, currentSelection));
    setHighlights(prev => prev.filter(h => h.id !== id));
    
    // Clean up replace text input
    setReplaceTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[id];
      return newTexts;
    });
  };

  const replaceHighlightedText = (highlightId: number) => {
    const highlight = highlights.find(h => h.id === highlightId);
    const replaceText = replaceTexts[highlightId] || '';
    
    if (!highlight) return;

    const contentState = editorState.getCurrentContent();
    const currentSelection = editorState.getSelection();
    
    // Get the first block
    const firstBlock = contentState.getFirstBlock();
    const blockKey = firstBlock.getKey();
    
    // Create selection for the highlight range
    const selection = SelectionState.createEmpty(blockKey).merge({
      anchorOffset: highlight.from,
      focusOffset: highlight.to,
    });

    // Replace the text
    const newContentState = Modifier.replaceText(
      contentState,
      selection,
      replaceText
    );

    const newEditorState = EditorState.set(editorState, {
      currentContent: newContentState,
    });

    // Restore original selection
    setEditorState(EditorState.forceSelection(newEditorState, currentSelection));
    
    // Remove this highlight from state
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
    
    // Clean up replace text input
    setReplaceTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[highlightId];
      return newTexts;
    });
  };

  const handleEditorChange = (newEditorState: EditorState) => {
    const oldContentState = editorState.getCurrentContent();
    const newContentState = newEditorState.getCurrentContent();
    
    // Check if content actually changed
    if (oldContentState !== newContentState) {
      const oldText = oldContentState.getPlainText();
      const newText = newContentState.getPlainText();
      
      // Calculate text changes to update highlight positions
      const textLengthDiff = newText.length - oldText.length;
      const currentSelection = newEditorState.getSelection();
      const changePosition = currentSelection.getStartOffset() - Math.max(0, textLengthDiff);
      
      // Update highlight positions and check for content changes
      const updatedHighlights: HighlightState[] = [];
      const highlightsToRemove: { id: number, from: number, to: number }[] = [];
      
      highlights.forEach(highlight => {
        let newFrom = highlight.from;
        let newTo = highlight.to;
        
        // If text was inserted/deleted before this highlight, adjust positions
        if (changePosition <= highlight.from) {
          newFrom = highlight.from + textLengthDiff;
          newTo = highlight.to + textLengthDiff;
        } else if (changePosition < highlight.to) {
          // Change happened within the highlight - we need to remove the entire affected range
          // Calculate the full range that might be affected after the change
          const affectedStart = highlight.from;
          const affectedEnd = Math.max(highlight.to, highlight.to + textLengthDiff);
          highlightsToRemove.push({ 
            id: highlight.id, 
            from: affectedStart, 
            to: Math.min(affectedEnd, newText.length)
          });
          return;
        }
        
        // Check if the highlight is still valid
        if (newFrom < 0 || newTo > newText.length || newFrom >= newTo) {
          highlightsToRemove.push({ id: highlight.id, from: highlight.from, to: highlight.to });
          return;
        }
        
        // Check if the content at the new position is the same as original
        const originalText = oldText.slice(highlight.from, highlight.to);
        const newHighlightText = newText.slice(newFrom, newTo);
        
        if (originalText !== newHighlightText) {
          highlightsToRemove.push({ id: highlight.id, from: newFrom, to: newTo });
          return;
        }
        
        updatedHighlights.push({
          ...highlight,
          from: newFrom,
          to: newTo
        });
      });

      // If we need to remove highlights, remove their entities from the content
      let finalEditorState = newEditorState;
      if (highlightsToRemove.length > 0) {
        let updatedContentState = newContentState;
        const firstBlock = newContentState.getFirstBlock();
        const blockKey = firstBlock.getKey();
        
        // Remove entities for highlights that should be removed
        highlightsToRemove.forEach(highlight => {
          const validStart = Math.max(0, Math.min(highlight.from, newText.length));
          const validEnd = Math.max(validStart, Math.min(highlight.to, newText.length));
          
          if (validStart < validEnd) {
            const selection = SelectionState.createEmpty(blockKey).merge({
              anchorOffset: validStart,
              focusOffset: validEnd,
            });
            
            updatedContentState = Modifier.applyEntity(updatedContentState, selection, null);
          }
        });

        if (updatedContentState !== newContentState) {
          finalEditorState = EditorState.set(newEditorState, {
            currentContent: updatedContentState,
          });
          // Preserve the cursor position
          finalEditorState = EditorState.forceSelection(finalEditorState, currentSelection);
        }
      }

      // Update highlights state
      setHighlights(updatedHighlights);
      
      // Clean up replace text inputs for removed highlights
      if (highlightsToRemove.length > 0) {
        setReplaceTexts(prev => {
          const newTexts = { ...prev };
          highlightsToRemove.forEach(highlight => delete newTexts[highlight.id]);
          return newTexts;
        });
      }
      
      setEditorState(finalEditorState);
    } else {
      setEditorState(newEditorState);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Text Area */}
      <div className="w-2/3 p-4">
        <div className="w-full h-[calc(100vh-2rem)] p-4 bg-white border rounded shadow text-black">
          <Editor
            ref={editorRef}
            editorState={editorState}
            onChange={handleEditorChange}
            placeholder="Start typing..."
          />
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-1/3 p-4 bg-gray-200">
        <h2 className="text-lg font-bold mb-4 text-black">Control Panel</h2>

        {/* Highlight Controls */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-2 text-black">Add Highlight</h3>
          <input
            type="number"
            value={highlightOffset}
            onChange={(e) => setHighlightOffset(e.target.value)}
            placeholder="Offset (0-based)"
            className="w-full p-2 mb-2 border rounded bg-white text-black placeholder-gray-600"
          />
          <input
            type="number"
            value={highlightLength}
            onChange={(e) => setHighlightLength(e.target.value)}
            placeholder="Length"
            className="w-full p-2 mb-2 border rounded bg-white text-black placeholder-gray-600"
          />
          <input
            type="color"
            value={highlightColor}
            onChange={(e) => setHighlightColor(e.target.value)}
            className="w-full mb-2"
          />
          <button
            onClick={addHighlight}
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Highlight
          </button>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-2 text-black">Instructions</h3>
          <p className="text-sm text-gray-600">
            Add highlights using offset and length above. Each highlight will have its own replace option below.
            If you edit any text within a highlight, that highlight will be automatically removed.
          </p>
        </div>

        {/* Highlight List */}
        <div>
          <h3 className="text-md font-semibold mb-2 text-black">Highlights</h3>
          {highlights.length === 0 ? (
            <p className="text-gray-600">No highlights yet</p>
          ) : (
            highlights.map((h) => (
              <div key={h.id} className="mb-3 p-3 bg-white rounded border">
                <div className="flex items-center mb-2">
                  <span
                    className="w-6 h-6 mr-2 inline-block rounded"
                    style={{ backgroundColor: h.color }}
                  ></span>
                  <span className="text-black text-sm flex-1">
                    Offset: {h.from}, Length: {h.to - h.from}
                  </span>
                  <button
                    onClick={() => removeHighlight(h.id)}
                    className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replaceTexts[h.id] || ''}
                    onChange={(e) => setReplaceTexts(prev => ({
                      ...prev,
                      [h.id]: e.target.value
                    }))}
                    placeholder="Replacement text"
                    className="flex-1 p-1 border rounded bg-white text-black text-sm placeholder-gray-500"
                  />
                  <button
                    onClick={() => replaceHighlightedText(h.id)}
                    className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    disabled={!replaceTexts[h.id]?.trim()}
                  >
                    Replace
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Export as dynamic client-side component
export default dynamic(() => Promise.resolve(TextEditor), { ssr: false });