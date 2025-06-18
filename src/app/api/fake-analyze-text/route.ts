import { NextRequest, NextResponse } from 'next/server';

interface APIRequest {
  versionId: string;
  fullText?: string;
  incrementalChanges?: {
    baseVersionId: string;
    changes: Array<{
      type: 'insert' | 'delete';
      position: number;
      length: number;
      text?: string;
    }>;
    affectedText: string;
    affectedOffset: number;
  };
}

interface FeedbackItem {
  offset: number;
  length: number;
  suggestion: string;
  explanation: string;
  confidence: number;
}

// Helper function to find word boundaries
function findWordBoundaries(text: string, startSearch: number = 0): { start: number; end: number; word: string } | null {
  // Skip any leading whitespace from startSearch
  let start = startSearch;
  while (start < text.length && /\s/.test(text[start])) {
    start++;
  }
  
  if (start >= text.length) return null;
  
  // Find end of word
  let end = start;
  while (end < text.length && /\S/.test(text[end])) {
    end++;
  }
  
  if (end > start) {
    return {
      start,
      end,
      word: text.substring(start, end)
    };
  }
  
  return null;
}

// Simulate text analysis
function analyzeText(text: string, offset: number = 0): FeedbackItem[] {
  const feedback: FeedbackItem[] = [];
  
  // Randomly select 0-2 words to mark for redaction
  const wordCount = Math.floor(Math.random() * 3); // 0, 1, or 2
  
  if (wordCount === 0 || text.trim().length === 0) {
    return feedback;
  }
  
  const usedPositions = new Set<number>();
  
  for (let i = 0; i < wordCount; i++) {
    // Find a random word in the text
    let attempts = 0;
    while (attempts < 10) {
      const randomStart = Math.floor(Math.random() * text.length);
      const wordInfo = findWordBoundaries(text, randomStart);
      
      if (wordInfo && !usedPositions.has(wordInfo.start)) {
        usedPositions.add(wordInfo.start);
        
        feedback.push({
          offset: offset + wordInfo.start,
          length: wordInfo.word.length,
          suggestion: 'REDACTED',
          explanation: `The word "${wordInfo.word}" should be redacted for security reasons.`,
          confidence: Math.random() * 0.5 + 0.5 // 0.5 to 1.0
        });
        break;
      }
      attempts++;
    }
  }
  
  return feedback;
}

export async function POST(request: NextRequest) {
  try {
    const body: APIRequest = await request.json();
    
    // Simulate network latency (0-2000ms)
    const delay = Math.floor(Math.random() * 2000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    let feedback: FeedbackItem[] = [];
    
    if (body.fullText) {
      // Analyze the full text
      feedback = analyzeText(body.fullText);
    } else if (body.incrementalChanges) {
      // Analyze only the affected portion
      const { affectedText, affectedOffset } = body.incrementalChanges;
      feedback = analyzeText(affectedText, affectedOffset);
    }
    
    return NextResponse.json({
      versionId: body.versionId,
      feedback
    });
  } catch (error) {
    console.error('Error in analyze-text API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}