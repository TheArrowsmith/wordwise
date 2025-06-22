import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with service role key for bypassing RLS
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { documentContent, promptText, cefrLevel, documentId } = await request.json();

    if (!documentContent || !promptText || !cefrLevel || !documentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract user from auth header (assuming Bearer token)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseServiceRole.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create initial submission record, now including the raw content.
    const { data: submission, error: insertError } = await supabaseServiceRole
      .from('grading_submissions')
      .insert({
        document_id: documentId,
        user_id: user.id,
        cefr_level_at_submission: cefrLevel,
        raw_document_content: documentContent,
        raw_prompt_text: promptText,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError || !submission) {
      console.error('Error creating submission:', insertError);
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      );
    }
    
    // Immediately return the submission ID
    return NextResponse.json({ submissionId: submission.id });

  } catch (error) {
    console.error('Error in grade-writing API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
