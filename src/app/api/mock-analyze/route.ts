import { NextRequest, NextResponse } from 'next/server';

import { FeedbackType } from "@/types";

// EDIT THIS VARIABLE TO CONTROL FEEDBACK PROBABILITY
const FEEDBACK_PROBABILITY = 0.7; // 70% chance of returning feedback

interface FeedbackRequest {
  documentId: string;
  content: string;
  contentHash: string;
  changeRegions?: Array<{ start: number; end: number }>;
  existingFeedbackIds?: string[];
}

interface FeedbackResponse {
  documentId: string;
  contentHash: string;
  feedback: Array<{
    id: string;
    start: number;
    length: number;
    originalText: string;
    suggestion: string;
    explanation: string;
    confidence: number;
    type: FeedbackType;
  }>;
  invalidatedFeedbackIds: string[];
}

// Sample feedback templates
const feedbackTemplates = [
  {
    suggestion: 'improve',
    explanation: 'Consider using a more specific word here',
    type: 'fluency'
  },
  {
    suggestion: 'enhance',
    explanation: 'This word could be more descriptive',
    type: 'spelling'
  },
  {
    suggestion: 'optimize',
    explanation: 'A more technical term might be appropriate',
    type: 'grammary'
  },
  {
    suggestion: 'clarify',
    explanation: 'This could be made clearer',
    type: 'fluency'
  },
  {
    suggestion: 'strengthen',
    explanation: 'A stronger verb would improve impact',
    type: 'spelling'
  },
  {
    suggestion: 'specify',
    explanation: 'More specific language would help',
    type: 'grammary'
  }
];

function findRandomWords(content: string, maxCount: number = 3): Array<{start: number, length: number, word: string}> {
  const words = [];
  const wordRegex = /\b\w{4,}\b/g; // Find words with 4+ characters
  let match;
  
  while ((match = wordRegex.exec(content)) !== null) {
    words.push({
      start: match.index,
      length: match[0].length,
      word: match[0]
    });
  }
  
  // Randomly select up to maxCount words
  const selectedWords = [];
  for (let i = 0; i < Math.min(maxCount, words.length); i++) {
    const randomIndex = Math.floor(Math.random() * words.length);
    selectedWords.push(words.splice(randomIndex, 1)[0]);
  }
  
  return selectedWords;
}

export async function POST(request: NextRequest) {
  console.log('API: Received request');
  
  const requestData: FeedbackRequest = await request.json();
  console.log('API: Content length:', requestData.content.length);
  
  // Simulate API latency
  const delay = Math.random() * 2000; // 0-2000ms delay
  console.log('API: Simulating delay of', Math.round(delay), 'ms');
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const shouldReturnFeedback = Math.random() < FEEDBACK_PROBABILITY;
  console.log('API: Should return feedback:', shouldReturnFeedback);
  
  const response: FeedbackResponse = {
    documentId: requestData.documentId,
    contentHash: requestData.contentHash,
    feedback: [],
    invalidatedFeedbackIds: []
  };
  
  if (shouldReturnFeedback && requestData.content.length > 10) {
    const wordsToImprove = findRandomWords(requestData.content, Math.floor(Math.random() * 3) + 1);
    console.log('API: Found words to improve:', wordsToImprove.map(w => w.word));
    
    response.feedback = wordsToImprove.map(word => {
      const template = feedbackTemplates[Math.floor(Math.random() * feedbackTemplates.length)];
      
      return {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        start: word.start,
        length: word.length,
        originalText: word.word,
        suggestion: template.suggestion,
        explanation: `${template.explanation} for "${word.word}"`,
        confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
        type: template.type
      };
    });
  }
  
  console.log('API: Returning', response.feedback.length, 'feedback items');
  return NextResponse.json(response);
} 
