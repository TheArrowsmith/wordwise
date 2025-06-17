import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text, cefrLevel, documentId } = await request.json();

    if (!text || !cefrLevel || !documentId) {
      return NextResponse.json(
        { error: 'Text, CEFR level, and document ID are required' },
        { status: 400 }
      );
    }

    const prompt = `
You are an expert language teacher. Analyze the following text written by a ${cefrLevel} level English learner.

Provide specific, actionable feedback focusing on:
1. Grammar errors and corrections
2. Vocabulary suggestions (appropriate for ${cefrLevel} level)
3. Sentence structure improvements
4. Overall fluency and coherence
5. Spelling and punctuation errors

Text to analyze:
"${text}"

Please provide your analysis in the following JSON format:
{
  "suggestions": [
    {
      "category": "spelling|grammar|fluency|clarity",
      "message": "Brief description of the issue",
      "explanation": "Detailed explanation of why this needs improvement",
      "offset": number (character position where issue starts),
      "length": number (length of problematic text),
      "suggested_fix": "single best correction for this issue"
    }
  ],
  "overallFeedback": "General comments about the writing",
  "score": number (1-10 rating appropriate for ${cefrLevel} level)
}

Important: 
- Use lowercase category names: "spelling", "grammar", "fluency", or "clarity"
- Provide exact character offsets for each issue
- Include a single best correction in "suggested_fix" field
- Be constructive and encouraging while being precise about areas for improvement
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful language learning assistant that provides detailed writing feedback."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Try to parse the JSON response
    try {
      const analysis = JSON.parse(responseText);
      
      // Transform suggestions to match our interface
      const transformedSuggestions = (analysis.suggestions || []).map((suggestion: any) => ({
        id: uuidv4(),
        category: suggestion.category?.toLowerCase() || 'clarity',
        message: suggestion.message || '',
        explanation: suggestion.explanation || '',
        suggested_fix: suggestion.suggested_fix || suggestion.suggestions?.[0] || '',
        offset: suggestion.offset || 0,
        length: suggestion.length || 0
      }));

      return NextResponse.json({
        ...analysis,
        suggestions: transformedSuggestions
      });
    } catch (parseError) {
      // If JSON parsing fails, return the raw text as feedback
      return NextResponse.json({
        suggestions: [],
        overallFeedback: responseText,
        score: 7
      });
    }

  } catch (error) {
    console.error('Error analyzing text:', error);
    return NextResponse.json(
      { error: 'Failed to analyze text' },
      { status: 500 }
    );
  }
} 