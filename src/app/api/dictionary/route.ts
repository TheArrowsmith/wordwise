import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { DictionaryRequest, DictionaryResponse } from '@/types/dictionary';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: DictionaryRequest = await request.json();
    const { word, nativeLanguage } = body;

    // Basic validation
    if (!word || !nativeLanguage) {
      return NextResponse.json(
        { error: 'Both word and nativeLanguage are required' },
        { status: 400 }
      );
    }

    if (typeof word !== 'string' || typeof nativeLanguage !== 'string') {
      return NextResponse.json(
        { error: 'Word and nativeLanguage must be strings' },
        { status: 400 }
      );
    }

    // Validate user authentication
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // System prompt for OpenAI
    const systemPrompt = `You are a dictionary assistant. Given an English word and a target language, provide definitions and translations.

Return your response as a JSON object with this exact structure:
{
  "wordFound": boolean,
  "definitions": [
    {
      "partOfSpeech": "string (e.g., Noun, Verb, Adjective)",
      "definition": "string (clear English definition)"
    }
  ],
  "translations": ["string array of translations in the target language"]
}

If the word is not found or doesn't exist, return:
{
  "wordFound": false,
  "definitions": [],
  "translations": []
}

Always return valid JSON. Include all distinct definitions with their parts of speech.`;

    // User prompt
    const userPrompt = `Word: "${word}"
Target language: ${nativeLanguage}

Please provide definitions and translations for this English word.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse OpenAI response
    let dictionaryData: DictionaryResponse;
    try {
      dictionaryData = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid response format from AI');
    }

    // Validate response structure
    if (typeof dictionaryData.wordFound !== 'boolean' ||
        !Array.isArray(dictionaryData.definitions) ||
        !Array.isArray(dictionaryData.translations)) {
      throw new Error('Invalid response structure from AI');
    }

    return NextResponse.json(dictionaryData);

  } catch (error) {
    console.error('Dictionary API error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Service configuration error' },
          { status: 500 }
        );
      }
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to process dictionary request' },
      { status: 500 }
    );
  }
} 