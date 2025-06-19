// pages/api/feedback.ts (Next.js API route)
import { NextRequest } from 'next';
import {NextResponse} from 'next/server';

interface FeedbackRequest {
  segments: Array<{
    text: string;
    id: string;
  }>;
}

interface FeedbackItem {
  start: number;
  end: number;
  text: string;
  suggestion: string;
  type: 'grammar' | 'spelling' | 'style';
  explanation: string;
}

interface FeedbackResponse {
  segments: Array<{
    id: string;
    feedback: FeedbackItem[];
  }>;
}

// Dummy grammar rules and common mistakes for ESL students
const grammarPatterns = [
  {
    pattern: /\b(is|are|was|were)\s+(go|went|come|came|do|did|have|had)\b/gi,
    type: 'grammar' as const,
    getSuggestion: (match: string) => {
      const words = match.toLowerCase().split(/\s+/);
      const auxiliary = words[0];
      const verb = words[1];
      
      // Convert to proper auxiliary + past participle
      const corrections: { [key: string]: string } = {
        'go': 'gone', 'went': 'gone',
        'come': 'come', 'came': 'come',
        'do': 'done', 'did': 'done',
        'have': 'had', 'had': 'had'
      };
      
      return `${auxiliary} ${corrections[verb] || verb}`;
    },
    explanation: "Use the past participle form after auxiliary verbs like 'is', 'are', 'was', 'were'."
  },
  {
    pattern: /\b(a|an)\s+([aeiouAEIOU])/g,
    type: 'grammar' as const,
    getSuggestion: (match: string) => {
      const parts = match.split(/\s+/);
      return `an ${parts[1]}`;
    },
    explanation: "Use 'an' before words that start with a vowel sound."
  },
  {
    pattern: /\b(a|an)\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])/g,
    type: 'grammar' as const,
    getSuggestion: (match: string) => {
      const parts = match.split(/\s+/);
      return `a ${parts[1]}`;
    },
    explanation: "Use 'a' before words that start with a consonant sound."
  },
  {
    pattern: /\b(he|she|it)\s+(don't|doesn't)\b/gi,
    type: 'grammar' as const,
    getSuggestion: (match: string) => {
      const words = match.toLowerCase().split(/\s+/);
      return `${words[0]} doesn't`;
    },
    explanation: "Use 'doesn't' with third person singular subjects (he, she, it)."
  },
  {
    pattern: /\b(I|you|we|they)\s+(doesn't)\b/gi,
    type: 'grammar' as const,
    getSuggestion: (match: string) => {
      const words = match.toLowerCase().split(/\s+/);
      return `${words[0]} don't`;
    },
    explanation: "Use 'don't' with first and second person subjects (I, you, we, they)."
  },
  {
    pattern: /\b(much|many)\s+(informations?|advices?|furnitures?|homeworks?|researches?)\b/gi,
    type: 'grammar' as const,
    getSuggestion: (match: string) => {
      const words = match.toLowerCase().split(/\s+/);
      const corrections: { [key: string]: string } = {
        'informations': 'information',
        'information': 'information',
        'advices': 'advice',
        'advice': 'advice',
        'furnitures': 'furniture',
        'furniture': 'furniture',
        'homeworks': 'homework',
        'homework': 'homework',
        'researches': 'research',
        'research': 'research'
      };
      return `much ${corrections[words[1]] || words[1]}`;
    },
    explanation: "These are uncountable nouns. Use 'much' instead of 'many' and don't add 's' for plural."
  },
  {
    pattern: /\b(peoples?|childs?|mans?|womans?)\b/gi,
    type: 'grammar' as const,
    getSuggestion: (match: string) => {
      const word = match.toLowerCase();
      const corrections: { [key: string]: string } = {
        'peoples': 'people',
        'people': 'people',
        'childs': 'children',
        'child': 'child',
        'mans': 'men',
        'man': 'man',
        'womans': 'women',
        'woman': 'woman'
      };
      return corrections[word] || word;
    },
    explanation: "These nouns have irregular plural forms."
  },
  {
    pattern: /\b(more|most)\s+(good|bad|far)\b/gi,
    type: 'grammar' as const,
    getSuggestion: (match: string) => {
      const words = match.toLowerCase().split(/\s+/);
      const corrections: { [key: string]: { [key: string]: string } } = {
        'good': { 'more': 'better', 'most': 'best' },
        'bad': { 'more': 'worse', 'most': 'worst' },
        'far': { 'more': 'farther', 'most': 'farthest' }
      };
      return corrections[words[1]][words[0]] || match;
    },
    explanation: "These adjectives have irregular comparative and superlative forms."
  }
];

const spellingPatterns = [
  {
    pattern: /\b(recieve|recieved|recieving)\b/gi,
    type: 'spelling' as const,
    getSuggestion: (match: string) => match.toLowerCase().replace('ie', 'ei'),
    explanation: "'I' before 'E' except after 'C' - the correct spelling is 'receive'."
  },
  {
    pattern: /\b(seperate|seperated|seperating)\b/gi,
    type: 'spelling' as const,
    getSuggestion: (match: string) => match.toLowerCase().replace('seperate', 'separate'),
    explanation: "Remember: 'separate' has 'a' in the middle, not 'e'."
  },
  {
    pattern: /\b(definately|definatly)\b/gi,
    type: 'spelling' as const,
    getSuggestion: () => 'definitely',
    explanation: "The correct spelling is 'definitely' - remember 'finite' is in the middle."
  },
  {
    pattern: /\b(occured|occurence)\b/gi,
    type: 'spelling' as const,
    getSuggestion: (match: string) => 
      match.toLowerCase() === 'occured' ? 'occurred' : 'occurrence',
    explanation: "Double the 'r' before adding endings to 'occur'."
  }
];

const stylePatterns = [
  {
    pattern: /\b(very|really|extremely|quite)\s+(very|really|extremely|quite)\b/gi,
    type: 'style' as const,
    getSuggestion: (match: string) => {
      const words = match.split(/\s+/);
      return words[1]; // Remove the first intensifier
    },
    explanation: "Avoid using multiple intensifiers together. One is enough for emphasis."
  },
  {
    pattern: /\b(thing|stuff|things|stuffs)\b/gi,
    type: 'style' as const,
    getSuggestion: (match: string) => {
      const alternatives = ['items', 'objects', 'elements', 'aspects', 'factors'];
      return alternatives[Math.floor(Math.random() * alternatives.length)];
    },
    explanation: "Try to use more specific words instead of vague terms like 'thing' or 'stuff'."
  },
  {
    pattern: /\b(good|bad|nice|big|small)\b/gi,
    type: 'style' as const,
    getSuggestion: (match: string) => {
      const alternatives: { [key: string]: string[] } = {
        'good': ['excellent', 'outstanding', 'remarkable', 'beneficial'],
        'bad': ['terrible', 'awful', 'harmful', 'inadequate'],
        'nice': ['pleasant', 'delightful', 'appealing', 'attractive'],
        'big': ['enormous', 'massive', 'substantial', 'significant'],
        'small': ['tiny', 'minimal', 'compact', 'minor']
      };
      const word = match.toLowerCase();
      const options = alternatives[word] || [word];
      return options[Math.floor(Math.random() * options.length)];
    },
    explanation: "Consider using more descriptive and specific adjectives to make your writing more engaging."
  }
];

function findFeedbackInText(text: string): FeedbackItem[] {
  const feedback: FeedbackItem[] = [];
  const allPatterns = [...grammarPatterns, ...spellingPatterns, ...stylePatterns];

  for (const pattern of allPatterns) {
    let match;
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      const matchText = match[0];
      const suggestion = pattern.getSuggestion(matchText);
      
      // Only add if suggestion is different from original
      if (suggestion.toLowerCase() !== matchText.toLowerCase()) {
        feedback.push({
          start: match.index,
          end: match.index + matchText.length,
          text: matchText,
          suggestion: suggestion,
          type: pattern.type,
          explanation: pattern.explanation
        });
      }
    }
  }

  // Sort by position and remove overlapping feedback
  feedback.sort((a, b) => a.start - b.start);
  
  const filteredFeedback: FeedbackItem[] = [];
  for (const item of feedback) {
    const overlaps = filteredFeedback.some(existing => 
      (item.start < existing.end && item.end > existing.start)
    );
    
    if (!overlaps) {
      filteredFeedback.push(item);
    }
  }

  return filteredFeedback;
}

export async function POST(req: NextRequest) {
    const { segments }: FeedbackRequest = req.body;

    if (!segments || !Array.isArray(segments)) {
      return NextResponse.json({
        status: 400,
        error: 'Invalid request format'
      })
    }

    // Simulate API processing time
    const processingDelay = Math.random() * 1000 + 500; // 500-1500ms

    setTimeout(() => {
      const response: FeedbackResponse = {
        segments: segments.map(segment => ({
          id: segment.id,
          feedback: findFeedbackInText(segment.text)
        }))
      };

      return NextResponse.json(response);
    }, processingDelay);
}
