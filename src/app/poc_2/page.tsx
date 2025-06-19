'use client';

// components/GrammarEditor.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Editor,
  EditorState,
  ContentState,
  CompositeDecorator,
  SelectionState,
  Modifier,
  ContentBlock,
  convertToRaw,
  convertFromRaw
} from 'draft-js';
import 'draft-js/dist/Draft.css';

// Types
interface TextOperation {
  id: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
}

interface DocumentState {
  text: string;
  operations: TextOperation[];
  version: number;
}

interface Feedback {
  id: string;
  originalText: string;
  startPos: number;
  endPos: number;
  documentVersion: number;
  suggestion: string;
  type: 'grammar' | 'spelling' | 'style';
  explanation: string;
  apiRequestId: string;
}

interface FeedbackState {
  active: Map<string, Feedback>;
  pending: Set<string>;
  cache: Map<string, Feedback[]>;
}

interface QueuedRequest {
  textSegment: string;
  startPos: number;
  endPos: number;
  documentVersion: number;
  hash: string;
}

// Utility functions
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

function transformPosition(position: number, operation: TextOperation): number {
  if (operation.type === 'insert' && operation.position <= position) {
    return position + (operation.content?.length || 0);
  }
  if (operation.type === 'delete' && operation.position < position) {
    const deleteEnd = operation.position + (operation.length || 0);
    if (position <= deleteEnd) {
      return operation.position;
    }
    return position - (operation.length || 0);
  }
  return position;
}

function transformFeedback(
  feedback: Feedback, 
  operations: TextOperation[]
): Feedback | null {
  let startPos = feedback.startPos;
  let endPos = feedback.endPos;
  
  for (const op of operations) {
    if (op.timestamp <= feedback.documentVersion) continue;
    
    const oldStartPos = startPos;
    const oldEndPos = endPos;
    
    startPos = transformPosition(startPos, op);
    endPos = transformPosition(endPos, op);
    
    // If the feedback span was affected by deletion, invalidate it
    if (op.type === 'delete') {
      const deleteStart = op.position;
      const deleteEnd = op.position + (op.length || 0);
      
      // Check if deletion overlaps with feedback range
      if (deleteStart < oldEndPos && deleteEnd > oldStartPos) {
        return null; // Feedback is no longer valid
      }
    }
  }
  
  return { ...feedback, startPos, endPos };
}

// Feedback Manager Class
class FeedbackManager {
  private requestQueue: Map<string, QueuedRequest> = new Map();
  private debounceTimer: NodeJS.Timeout | null = null;
  private feedbackState: FeedbackState;
  private documentState: DocumentState;
  private onFeedbackUpdate: () => void;

  constructor(
    feedbackState: FeedbackState,
    documentState: DocumentState,
    onFeedbackUpdate: () => void
  ) {
    this.feedbackState = feedbackState;
    this.documentState = documentState;
    this.onFeedbackUpdate = onFeedbackUpdate;
  }

  async requestFeedback(
    text: string,
    changedRanges: Array<{ start: number; end: number }>,
    documentVersion: number
  ) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Queue requests for changed ranges
    for (const range of changedRanges) {
      const segment = text.slice(range.start, range.end);
      const hash = hashText(segment);

      // Check cache first
      if (this.feedbackState.cache.has(hash)) {
        this.applyFeedbackFromCache(hash, range.start, documentVersion);
        continue;
      }

      // Skip if already pending or too short
      if (this.feedbackState.pending.has(hash) || segment.trim().length < 3) {
        continue;
      }

      this.requestQueue.set(hash, {
        textSegment: segment,
        startPos: range.start,
        endPos: range.end,
        documentVersion,
        hash
      });
    }

    // Debounce API calls
    this.debounceTimer = setTimeout(() => {
      this.processBatchedRequests();
    }, 500);
  }

  private applyFeedbackFromCache(hash: string, startPos: number, documentVersion: number) {
    const cachedFeedback = this.feedbackState.cache.get(hash);
    if (cachedFeedback) {
      for (const feedback of cachedFeedback) {
        const adjustedFeedback: Feedback = {
          ...feedback,
          id: `${feedback.id}_${Date.now()}`,
          startPos: startPos + feedback.startPos,
          endPos: startPos + feedback.endPos,
          documentVersion
        };
        this.feedbackState.active.set(adjustedFeedback.id, adjustedFeedback);
      }
      this.onFeedbackUpdate();
    }
  }

  private async processBatchedRequests() {
    const requests = Array.from(this.requestQueue.values());
    this.requestQueue.clear();

    if (requests.length === 0) return;

    // Mark as pending
    requests.forEach(req => this.feedbackState.pending.add(req.hash));

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: requests.map(r => ({
            text: r.textSegment,
            id: r.hash
          }))
        })
      });

      const data = await response.json();
      this.handleFeedbackResponse(data, requests);
    } catch (error) {
      console.error('Feedback API error:', error);
    } finally {
      requests.forEach(req => this.feedbackState.pending.delete(req.hash));
    }
  }

  private handleFeedbackResponse(response: any, originalRequests: QueuedRequest[]) {
    for (const segmentResult of response.segments) {
      const originalRequest = originalRequests.find(r => r.hash === segmentResult.id);
      if (!originalRequest) continue;

      // Transform feedback positions to current document state
      const operationsSince = this.documentState.operations.filter(
        op => op.timestamp > originalRequest.documentVersion
      );

      const validFeedback: Feedback[] = [];
      
      for (const feedbackItem of segmentResult.feedback) {
        // Create feedback with absolute positions
        const absoluteFeedback: Feedback = {
          id: `${segmentResult.id}_${feedbackItem.start}_${Date.now()}`,
          originalText: feedbackItem.text,
          startPos: originalRequest.startPos + feedbackItem.start,
          endPos: originalRequest.startPos + feedbackItem.end,
          documentVersion: originalRequest.documentVersion,
          suggestion: feedbackItem.suggestion,
          type: feedbackItem.type,
          explanation: feedbackItem.explanation,
          apiRequestId: segmentResult.id
        };

        // Transform to current document state
        const transformedFeedback = transformFeedback(absoluteFeedback, operationsSince);
        
        if (transformedFeedback) {
          // Verify the text still matches
          const currentText = this.documentState.text.slice(
            transformedFeedback.startPos,
            transformedFeedback.endPos
          );

          if (currentText === transformedFeedback.originalText) {
            validFeedback.push(transformedFeedback);
            this.feedbackState.active.set(transformedFeedback.id, transformedFeedback);
          }
        }
      }

      // Cache the feedback for this text segment
      this.feedbackState.cache.set(originalRequest.hash, segmentResult.feedback.map((f: any) => ({
        ...f,
        id: f.id || `${segmentResult.id}_${f.start}`,
        documentVersion: originalRequest.documentVersion,
        apiRequestId: segmentResult.id
      })));
    }

    this.onFeedbackUpdate();
  }

  updateFeedbackPositions(operations: TextOperation[]) {
    const updatedFeedback = new Map<string, Feedback>();
    
    for (const [id, feedback] of this.feedbackState.active) {
      const relevantOps = operations.filter(op => op.timestamp > feedback.documentVersion);
      const transformedFeedback = transformFeedback(feedback, relevantOps);
      
      if (transformedFeedback) {
        // Verify the text still matches after transformation
        const currentText = this.documentState.text.slice(
          transformedFeedback.startPos,
          transformedFeedback.endPos
        );
        
        if (currentText === transformedFeedback.originalText) {
          updatedFeedback.set(id, {
            ...transformedFeedback,
            documentVersion: this.documentState.version
          });
        }
      }
    }
    
    this.feedbackState.active = updatedFeedback;
    this.onFeedbackUpdate();
  }

  removeFeedbackInRange(startPos: number, endPos: number) {
    const feedbackToRemove: string[] = [];
    
    for (const [id, feedback] of this.feedbackState.active) {
      // Remove feedback that overlaps with the edited range
      if (feedback.startPos < endPos && feedback.endPos > startPos) {
        feedbackToRemove.push(id);
      }
    }
    
    feedbackToRemove.forEach(id => this.feedbackState.active.delete(id));
    if (feedbackToRemove.length > 0) {
      this.onFeedbackUpdate();
    }
  }
}

// Feedback Highlight Component
const FeedbackHighlight: React.FC<{
  children: React.ReactNode;
  feedbackId: string;
  feedbackType: string;
  onClick: () => void;
}> = ({ children, feedbackId, feedbackType, onClick }) => {
  return (
    <span
      className={`feedback-highlight feedback-${feedbackType}`}
      onClick={onClick}
      data-feedback-id={feedbackId}
      style={{
        backgroundColor: feedbackType === 'grammar' ? '#ffebee' : 
                        feedbackType === 'spelling' ? '#fff3e0' : '#e8f5e8',
        borderBottom: `2px solid ${feedbackType === 'grammar' ? '#f44336' : 
                                  feedbackType === 'spelling' ? '#ff9800' : '#4caf50'}`,
        cursor: 'pointer',
        borderRadius: '2px'
      }}
    >
      {children}
    </span>
  );
};

// Change Tracker Class
class ChangeTracker {
  private lastProcessedVersion = 0;

  getChangedRanges(
    currentState: DocumentState,
    lastFeedbackUpdate: number
  ): Array<{ start: number; end: number }> {
    const relevantOps = currentState.operations.filter(
      op => op.timestamp > lastFeedbackUpdate
    );

    if (relevantOps.length === 0) return [];

    const changedRanges = this.calculateAffectedRanges(relevantOps, currentState.text);
    return this.mergeOverlappingRanges(changedRanges);
  }

  private calculateAffectedRanges(
    operations: TextOperation[],
    text: string
  ): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];

    for (const op of operations) {
      if (op.type === 'insert' || op.type === 'delete') {
        // Expand to word boundaries
        const start = this.findWordBoundary(text, op.position, 'backward');
        const end = this.findWordBoundary(
          text,
          op.type === 'insert' ? op.position + (op.content?.length || 0) : op.position,
          'forward'
        );

        ranges.push({
          start: Math.max(0, start - 20), // Extra context
          end: Math.min(text.length, end + 20)
        });
      }
    }

    return ranges;
  }

  private findWordBoundary(text: string, position: number, direction: 'forward' | 'backward'): number {
    if (direction === 'backward') {
      for (let i = position - 1; i >= 0; i--) {
        if (/\s/.test(text[i])) {
          return i + 1;
        }
      }
      return 0;
    } else {
      for (let i = position; i < text.length; i++) {
        if (/\s/.test(text[i])) {
          return i;
        }
      }
      return text.length;
    }
  }

  private mergeOverlappingRanges(
    ranges: Array<{ start: number; end: number }>
  ): Array<{ start: number; end: number }> {
    if (ranges.length === 0) return [];

    ranges.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [ranges[0]];

    for (let i = 1; i < ranges.length; i++) {
      const current = ranges[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }
}

// Main Grammar Editor Component
const GrammarEditor: React.FC = () => {
  const [isClient, setIsClient] = useState(false);
  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [documentState, setDocumentState] = useState<DocumentState>({
    text: '',
    operations: [],
    version: 0
  });
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({
    active: new Map(),
    pending: new Set(),
    cache: new Map()
  });
  
  const feedbackManagerRef = useRef<FeedbackManager | null>(null);
  const changeTrackerRef = useRef(new ChangeTracker());
  const lastFeedbackUpdate = useRef(0);
  const editorRef = useRef<Editor>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize feedback manager
  useEffect(() => {
    feedbackManagerRef.current = new FeedbackManager(
      feedbackState,
      documentState,
      () => {
        setFeedbackState(prev => ({ ...prev }));
        updateDecorator();
      }
    );
  }, []);

  const updateDecorator = useCallback(() => {
    const decorator = new CompositeDecorator([
      {
        strategy: (contentBlock: ContentBlock, callback: (start: number, end: number) => void) => {
          const text = contentBlock.getText();
          const blockStart = getBlockStartPosition(contentBlock, editorState.getCurrentContent());
          
          // Find feedback that intersects with this block
          for (const [id, feedback] of feedbackState.active) {
            const relativeStart = Math.max(0, feedback.startPos - blockStart);
            const relativeEnd = Math.min(text.length, feedback.endPos - blockStart);
            
            if (relativeStart < relativeEnd && relativeStart >= 0 && relativeEnd <= text.length) {
              callback(relativeStart, relativeEnd);
            }
          }
        },
        component: (props: any) => {
          const blockStart = getBlockStartPosition(
            props.contentState.getBlockForKey(props.blockKey),
            props.contentState
          );
          const absoluteStart = blockStart + props.start;
          const absoluteEnd = blockStart + props.end;
          
          // Find the feedback for this range
          let matchingFeedback: Feedback | null = null;
          for (const [id, feedback] of feedbackState.active) {
            if (feedback.startPos === absoluteStart && feedback.endPos === absoluteEnd) {
              matchingFeedback = feedback;
              break;
            }
          }
          
          if (!matchingFeedback) return <span>{props.children}</span>;
          
          return (
            <FeedbackHighlight
              feedbackId={matchingFeedback.id}
              feedbackType={matchingFeedback.type}
              onClick={() => scrollToFeedback(matchingFeedback.id)}
            >
              {props.children}
            </FeedbackHighlight>
          );
        }
      }
    ]);

    setEditorState(prevState => 
      EditorState.set(prevState, { decorator })
    );
  }, [feedbackState.active, editorState]);

  const getBlockStartPosition = (block: ContentBlock, contentState: ContentState): number => {
    let position = 0;
    const blockArray = contentState.getBlocksAsArray();
    
    for (const currentBlock of blockArray) {
      if (currentBlock.getKey() === block.getKey()) {
        break;
      }
      position += currentBlock.getLength() + 1; // +1 for newline
    }
    
    return position;
  };

  const handleEditorChange = useCallback((newEditorState: EditorState) => {
    const oldText = documentState.text;
    const newText = newEditorState.getCurrentContent().getPlainText();
    
    // Create operation for this change
    const operation: TextOperation = {
      id: `op_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      type: newText.length > oldText.length ? 'insert' : 
            newText.length < oldText.length ? 'delete' : 'retain',
      position: 0, // Will be calculated properly in a real implementation
      content: newText.length > oldText.length ? newText.slice(oldText.length) : undefined,
      length: newText.length < oldText.length ? oldText.length - newText.length : undefined
    };

    // Find the actual change position
    let changeStart = 0;
    while (changeStart < Math.min(oldText.length, newText.length) && 
           oldText[changeStart] === newText[changeStart]) {
      changeStart++;
    }
    operation.position = changeStart;

    const newDocumentState: DocumentState = {
      text: newText,
      operations: [...documentState.operations, operation],
      version: documentState.version + 1
    };

    setDocumentState(newDocumentState);
    setEditorState(newEditorState);

    // Remove feedback in the changed range
    if (operation.type !== 'retain') {
      const endPos = operation.type === 'insert' 
        ? operation.position + (operation.content?.length || 0)
        : operation.position + (operation.length || 0);
      
      feedbackManagerRef.current?.removeFeedbackInRange(operation.position, endPos);
    }

    // Update feedback positions
    feedbackManagerRef.current?.updateFeedbackPositions([operation]);

    // Request new feedback for changed areas
    if (newText.trim().length > 0) {
      const changedRanges = changeTrackerRef.current.getChangedRanges(
        newDocumentState,
        lastFeedbackUpdate.current
      );
      
      if (changedRanges.length > 0) {
        feedbackManagerRef.current?.requestFeedback(
          newText,
          changedRanges,
          newDocumentState.version
        );
        lastFeedbackUpdate.current = Date.now();
      }
    }
  }, [documentState, feedbackState]);

  const applySuggestion = useCallback((feedbackId: string) => {
    const feedback = feedbackState.active.get(feedbackId);
    if (!feedback) return;

    const contentState = editorState.getCurrentContent();
    const blockArray = contentState.getBlocksAsArray();
    
    // Find the block and position for this feedback
    let currentPos = 0;
    let targetBlock: ContentBlock | null = null;
    let relativeStart = 0;
    let relativeEnd = 0;

    for (const block of blockArray) {
      const blockLength = block.getLength();
      
      if (currentPos + blockLength >= feedback.startPos) {
        targetBlock = block;
        relativeStart = feedback.startPos - currentPos;
        relativeEnd = feedback.endPos - currentPos;
        break;
      }
      
      currentPos += blockLength + 1; // +1 for newline
    }

    if (!targetBlock) return;

    // Create selection for the feedback range
    const selection = SelectionState.createEmpty(targetBlock.getKey()).merge({
      anchorOffset: relativeStart,
      focusOffset: relativeEnd
    });

    // Replace the text with the suggestion
    const newContentState = Modifier.replaceText(
      contentState,
      selection,
      feedback.suggestion
    );

    const newEditorState = EditorState.push(
      editorState,
      newContentState,
      'insert-characters'
    );

    // Remove the applied feedback
    const newFeedbackState = { ...feedbackState };
    newFeedbackState.active.delete(feedbackId);
    setFeedbackState(newFeedbackState);

    setEditorState(newEditorState);

    // Update document state
    const newText = newContentState.getPlainText();
    const operation: TextOperation = {
      id: `apply_${Date.now()}`,
      timestamp: Date.now(),
      type: 'insert',
      position: feedback.startPos,
      content: feedback.suggestion,
      length: feedback.endPos - feedback.startPos
    };

    setDocumentState(prev => ({
      text: newText,
      operations: [...prev.operations, operation],
      version: prev.version + 1
    }));
  }, [editorState, feedbackState]);

  const scrollToFeedback = useCallback((feedbackId: string) => {
    const element = document.querySelector(`[data-feedback-id="${feedbackId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Sort feedback by position for side panel
  const sortedFeedback = Array.from(feedbackState.active.values())
    .sort((a, b) => a.startPos - b.startPos);

  // Don't render editor on server to prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="grammar-editor" style={{ display: 'flex', height: '100vh' }}>
        <div className="editor-container" style={{ flex: 1, padding: '20px' }}>
          <div 
            style={{ 
              border: '1px solid #ccc', 
              borderRadius: '4px', 
              padding: '16px',
              minHeight: '400px',
              fontSize: '16px',
              lineHeight: '1.5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666'
            }}
          >
            Loading editor...
          </div>
        </div>
        
        <div 
          className="feedback-panel" 
          style={{ 
            width: '350px', 
            borderLeft: '1px solid #ccc', 
            padding: '20px',
            overflowY: 'auto',
            backgroundColor: '#f9f9f9'
          }}
        >
          <h3 style={{ marginTop: 0 }}>Suggestions (0)</h3>
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grammar-editor" style={{ display: 'flex', height: '100vh' }}>
      <div className="editor-container" style={{ flex: 1, padding: '20px' }}>
        <div 
          style={{ 
            border: '1px solid #ccc', 
            borderRadius: '4px', 
            padding: '16px',
            minHeight: '400px',
            fontSize: '16px',
            lineHeight: '1.5'
          }}
        >
          <Editor
            ref={editorRef}
            editorState={editorState}
            onChange={handleEditorChange}
            placeholder="Start typing to get grammar suggestions..."
          />
        </div>
      </div>
      
      <div 
        className="feedback-panel" 
        style={{ 
          width: '350px', 
          borderLeft: '1px solid #ccc', 
          padding: '20px',
          overflowY: 'auto',
          backgroundColor: '#f9f9f9'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Suggestions ({sortedFeedback.length})</h3>
        
        {sortedFeedback.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No suggestions yet. Start typing to see grammar feedback.
          </p>
        ) : (
          sortedFeedback.map((feedback) => (
            <div 
              key={feedback.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span 
                  style={{
                    backgroundColor: feedback.type === 'grammar' ? '#f44336' : 
                                   feedback.type === 'spelling' ? '#ff9800' : '#4caf50',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                >
                  {feedback.type}
                </span>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Original:</strong> "{feedback.originalText}"
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Suggestion:</strong> "{feedback.suggestion}"
                </div>
              </div>
              
              <p style={{ 
                fontSize: '14px', 
                color: '#666', 
                marginBottom: '12px',
                lineHeight: '1.4'
              }}>
                {feedback.explanation}
              </p>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => applySuggestion(feedback.id)}
                  style={{
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    const newFeedbackState = { ...feedbackState };
                    newFeedbackState.active.delete(feedback.id);
                    setFeedbackState(newFeedbackState);
                  }}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <div>
      <head>
        <title>Grammar Editor - ESL Writing Assistant</title>
        <meta name="description" content="AI-powered grammar checker for ESL students" />
      </head>
      
      <main style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <header style={{ 
          backgroundColor: '#2c3e50', 
          color: 'white', 
          padding: '1rem 2rem',
          marginBottom: '0'
        }}>
          <h1 style={{ margin: 0 }}>Grammar Editor</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            AI-powered writing assistant for ESL students
          </p>
        </header>
        
        <GrammarEditor />
      </main>
    </div>
  );
}
