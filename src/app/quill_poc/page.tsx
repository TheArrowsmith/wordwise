"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
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

import { FeedbackType } from "@/types";

interface FeedbackState {
  id: number;
  from: number;
  to: number;
  type: FeedbackType;
  explanation: string;
  suggestion: string;
}

// Function to get color based on feedback type
const getFeedbackColor = (type: FeedbackType): string => {
  switch (type) {
    case 'spelling': return '#ffb3b3'; // Medium pastel red
    case 'grammar': return '#ffcc99'; // Medium pastel orange
    case 'fluency': return '#ffff99'; // Medium pastel yellow
    default: return '#ffff99';
  }
};

// Feedback component for rendering
const FeedbackSpan = ({ 
  children, 
  contentState,
  entityKey 
}: { 
  children: React.ReactNode; 
  contentState: ContentState;
  entityKey: string;
}) => {
  const entity = contentState.getEntity(entityKey);
  const { type } = entity.getData();
  const color = getFeedbackColor(type);
  
  return (
    <span style={{ backgroundColor: color, borderRadius: '2px' }}>
      {children}
    </span>
  );
};

// Strategy function to find feedback entities
const findFeedbackEntities = (
  contentBlock: ContentBlock,
  callback: (start: number, end: number) => void,
  contentState: ContentState
) => {
  contentBlock.findEntityRanges(
    (character) => {
      const entityKey = character.getEntity();
      return (
        entityKey !== null &&
        contentState.getEntity(entityKey).getType() === 'FEEDBACK'
      );
    },
    callback
  );
};

function debounceAndThrottle(callback: (...args: any[]) => void, debounceDelay: number, throttleInterval: number) {
  let debounceTimer: NodeJS.Timeout;
  let lastCallTime = 0;

  return function (...args: any[]) {
    const now = Date.now();

    // Clear any existing debounce timer
    clearTimeout(debounceTimer);

    // If enough time has passed since the last call (throttleInterval), call immediately
    if (now - lastCallTime >= throttleInterval) {
      callback(...args);
      lastCallTime = now;
    } else {
      // Otherwise, set a debounce timer to call after the debounceDelay
      debounceTimer = setTimeout(() => {
        callback(...args);
        lastCallTime = Date.now();
      }, debounceDelay);
    }
  };
}

const TextEditor = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackState[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  
  // Create decorator for feedbacks
  const decorator = new CompositeDecorator([
    {
      strategy: findFeedbackEntities,
      component: FeedbackSpan,
    },
  ]);
  
  const [editorState, setEditorState] = useState(() =>
    EditorState.createWithContent(
      ContentState.createFromText(
        "Click here to start typing. As you type, feedback will automatically appear on random words to demonstrate the highlighting system."
      ),
      decorator
    )
  );

  const editorRef = useRef<Editor>(null);

  const getFeedback = useCallback(async (currentEditorState: EditorState) => {
    // 25% chance of adding feedback
    if (Math.random() > 0.25) {
      return;
    }

    const contentState = currentEditorState.getCurrentContent();
    const text = contentState.getPlainText();
    
    // Split text into words and find their positions
    const words = text.match(/\b\w+\b/g);
    if (!words || words.length === 0) {
      return;
    }

    // Find all word positions
    const wordPositions: { word: string; start: number; end: number }[] = [];
    let searchIndex = 0;
    
    words.forEach(word => {
      const wordIndex = text.indexOf(word, searchIndex);
      if (wordIndex !== -1) {
        const start = wordIndex;
        const end = wordIndex + word.length;
        
        // Check if this word already has feedback
        const hasExistingFeedback = feedbacks.some(feedback => 
          (feedback.from <= start && feedback.to > start) ||
          (feedback.from < end && feedback.to >= end) ||
          (start <= feedback.from && end > feedback.from)
        );
        
        if (!hasExistingFeedback) {
          wordPositions.push({ word, start, end });
        }
        
        searchIndex = wordIndex + word.length;
      }
    });

    if (wordPositions.length === 0) {
      return;
    }

    // Show loading spinner
    setIsLoadingFeedback(true);

    // Simulate API latency with random delay
    const delay = Math.floor(Math.random() * 1500) + 500; // 500-2000ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Randomly select a word
    const randomWord = wordPositions[Math.floor(Math.random() * wordPositions.length)];
    
    // Randomly select feedback type
    const feedbackTypes: FeedbackType[] = ['spelling', 'grammar', 'fluency'];
    const randomType = feedbackTypes[Math.floor(Math.random() * feedbackTypes.length)];

    const newFeedback: FeedbackState = {
      id: Date.now(),
      from: randomWord.start,
      to: randomWord.end,
      type: randomType,
      explanation: "You should change something",
      suggestion: "[NEW TEXT]",
    };

    // Create entity for the feedback
    const contentStateWithEntity = contentState.createEntity(
      'FEEDBACK',
      'MUTABLE',
      { type: randomType, id: newFeedback.id }
    );
    const entityKey = contentStateWithEntity.getLastCreatedEntityKey();

    // Get the first (and typically only) block
    const firstBlock = contentState.getFirstBlock();
    const blockKey = firstBlock.getKey();

    // Create selection for the range to highlight
    const selection = SelectionState.createEmpty(blockKey).merge({
      anchorOffset: randomWord.start,
      focusOffset: randomWord.end,
    });

    // Apply the entity to the selected range
    const newContentState = Modifier.applyEntity(
      contentStateWithEntity,
      selection,
      entityKey
    );

    // Update editor state while preserving current cursor position
    const currentSelection = currentEditorState.getSelection();
    const newEditorState = EditorState.set(currentEditorState, {
      currentContent: newContentState,
    });
    
    // Restore original selection and update states
    setEditorState(EditorState.forceSelection(newEditorState, currentSelection));
    setFeedbacks(prev => [...prev, newFeedback]);
    setIsLoadingFeedback(false);
  }, [feedbacks]);

  // Create debounced and throttled version of getFeedback
  const debouncedGetFeedback = useCallback(
    debounceAndThrottle(getFeedback, 500, 1000), // 1s debounce, 3s throttle
    [getFeedback]
  );

  const removeFeedback = (id: number) => {
    const feedback = feedbacks.find(f => f.id === id);
    if (!feedback) return;

    const contentState = editorState.getCurrentContent();
    const currentSelection = editorState.getSelection();
    
    // Get the first block
    const firstBlock = contentState.getFirstBlock();
    const blockKey = firstBlock.getKey();
    
    // Create selection for the feedback range
    const selection = SelectionState.createEmpty(blockKey).merge({
      anchorOffset: feedback.from,
      focusOffset: feedback.to,
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
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  const applyFeedback = (feedbackId: number) => {
    const feedback = feedbacks.find(f => f.id === feedbackId);
    
    if (!feedback) return;

    const contentState = editorState.getCurrentContent();
    const currentSelection = editorState.getSelection();
    
    // Get the first block
    const firstBlock = contentState.getFirstBlock();
    const blockKey = firstBlock.getKey();
    
    // Create selection for the feedback range
    const selection = SelectionState.createEmpty(blockKey).merge({
      anchorOffset: feedback.from,
      focusOffset: feedback.to,
    });

    // Replace the text with the suggestion
    const newContentState = Modifier.replaceText(
      contentState,
      selection,
      feedback.suggestion
    );

    const newEditorState = EditorState.set(editorState, {
      currentContent: newContentState,
    });

    // Calculate the length difference caused by the replacement
    const originalLength = feedback.to - feedback.from;
    const newLength = feedback.suggestion.length;
    const lengthDiff = newLength - originalLength;

    // Update positions of other feedback items that come after this one
    const updatedFeedbacks = feedbacks
      .filter(f => f.id !== feedbackId) // Remove the applied feedback
      .map(f => {
        if (f.from >= feedback.to) {
          // Feedback comes after the replaced text - adjust both start and end
          return {
            ...f,
            from: f.from + lengthDiff,
            to: f.to + lengthDiff
          };
        } else if (f.from < feedback.from && f.to > feedback.from) {
          // Feedback overlaps with the replaced text - remove it as it's now invalid
          return null;
        }
        // Feedback comes before the replaced text - no change needed
        return f;
      })
      .filter(f => f !== null) as FeedbackState[];

    // Remove entities for any overlapping feedbacks that were invalidated
    let finalContentState = newContentState;
    const invalidatedFeedbacks = feedbacks.filter(f => 
      f.id !== feedbackId && 
      f.from < feedback.from && 
      f.to > feedback.from
    );

    if (invalidatedFeedbacks.length > 0) {
      invalidatedFeedbacks.forEach(f => {
        const invalidSelection = SelectionState.createEmpty(blockKey).merge({
          anchorOffset: Math.max(0, f.from),
          focusOffset: Math.min(finalContentState.getPlainText().length, f.to + lengthDiff),
        });
        
        finalContentState = Modifier.applyEntity(finalContentState, invalidSelection, null);
      });
    }

    const finalEditorState = EditorState.set(newEditorState, {
      currentContent: finalContentState,
    });

    // Restore original selection
    setEditorState(EditorState.forceSelection(finalEditorState, currentSelection));
    
    // Update feedbacks state with adjusted positions
    setFeedbacks(updatedFeedbacks);
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
      
      // Update feedback positions and check for content changes
      const updatedFeedbacks: FeedbackState[] = [];
      const feedbacksToRemove: { id: number, from: number, to: number }[] = [];
      
      feedbacks.forEach(feedback => {
        let newFrom = feedback.from;
        let newTo = feedback.to;
        
        // If text was inserted/deleted before this feedback, adjust positions
        if (changePosition <= feedback.from) {
          newFrom = feedback.from + textLengthDiff;
          newTo = feedback.to + textLengthDiff;
        } else if (changePosition < feedback.to) {
          // Change happened within the feedback - we need to remove the entire affected range
          // Calculate the full range that might be affected after the change
          const affectedStart = feedback.from;
          const affectedEnd = Math.max(feedback.to, feedback.to + textLengthDiff);
          feedbacksToRemove.push({ 
            id: feedback.id, 
            from: affectedStart, 
            to: Math.min(affectedEnd, newText.length)
          });
          return;
        }
        
        // Check if the feedback is still valid
        if (newFrom < 0 || newTo > newText.length || newFrom >= newTo) {
          feedbacksToRemove.push({ id: feedback.id, from: feedback.from, to: feedback.to });
          return;
        }
        
        // Check if the content at the new position is the same as original
        const originalText = oldText.slice(feedback.from, feedback.to);
        const newFeedbackText = newText.slice(newFrom, newTo);
        
        if (originalText !== newFeedbackText) {
          feedbacksToRemove.push({ id: feedback.id, from: newFrom, to: newTo });
          return;
        }
        
        updatedFeedbacks.push({
          ...feedback,
          from: newFrom,
          to: newTo
        });
      });

      // If we need to remove feedbacks, remove their entities from the content
      let finalEditorState = newEditorState;
      if (feedbacksToRemove.length > 0) {
        let updatedContentState = newContentState;
        const firstBlock = newContentState.getFirstBlock();
        const blockKey = firstBlock.getKey();
        
        // Remove entities for feedbacks that should be removed
        feedbacksToRemove.forEach(feedback => {
          const validStart = Math.max(0, Math.min(feedback.from, newText.length));
          const validEnd = Math.max(validStart, Math.min(feedback.to, newText.length));
          
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

      // Update feedbacks state
      setFeedbacks(updatedFeedbacks);
      
      setEditorState(finalEditorState);
      
      // Trigger debounced feedback generation
      debouncedGetFeedback(finalEditorState);
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
        <h2 className="text-lg font-bold mb-4 text-black">Feedback Panel</h2>

        {/* Loading Spinner */}
        {isLoadingFeedback && (
          <div className="mb-4 flex items-center justify-center">
            <svg 
              className="animate-spin h-5 w-5 text-gray-600" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                stroke="currentColor"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span className="ml-2 text-sm text-gray-600">Analyzing text...</span>
          </div>
        )}

        {/* Feedback List */}
        <div>
          <h3 className="text-md font-semibold mb-2 text-black">Feedback</h3>
          {feedbacks.length === 0 ? (
            <p className="text-gray-600">No feedback yet - start typing to see automatic feedback appear!</p>
          ) : (
            feedbacks
              .sort((a, b) => a.from - b.from) // Sort by text position
              .map((f) => {
                const currentText = editorState.getCurrentContent().getPlainText();
                const textExtract = currentText.slice(f.from, f.to);
                
                return (
                  <div key={f.id} className="mb-3 p-3 bg-white rounded border">
                    <div className="flex items-center mb-2">
                      <span
                        className="w-6 h-6 mr-2 inline-block rounded"
                        style={{ backgroundColor: getFeedbackColor(f.type) }}
                      ></span>
                      <span className="text-black text-sm flex-1">
                        {f.type.charAt(0).toUpperCase() + f.type.slice(1)}
                      </span>
                      <button
                        onClick={() => removeFeedback(f.id)}
                        className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs text-gray-600 mb-1">Text:</p>
                      <p className="text-sm text-black font-mono bg-gray-100 p-1 rounded">"{textExtract}"</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs text-gray-600 mb-1">Explanation:</p>
                      <p className="text-sm text-black">{f.explanation}</p>
                    </div>
                    <div className="mb-2">
                      <p className="text-xs text-gray-600 mb-1">Suggestion:</p>
                      <p className="text-sm text-black">{f.suggestion}</p>
                    </div>
                    <button
                      onClick={() => applyFeedback(f.id)}
                      className="w-full px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                      Apply
                    </button>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};

// Export as dynamic client-side component
export default dynamic(() => Promise.resolve(TextEditor), { ssr: false });
