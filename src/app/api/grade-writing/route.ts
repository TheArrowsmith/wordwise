import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
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

    // Create initial submission record
    const { data: submission, error: insertError } = await supabaseServiceRole
      .from('grading_submissions')
      .insert({
        document_id: documentId,
        user_id: user.id,
        cefr_level_at_submission: cefrLevel,
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

    // Start the grading process asynchronously
    processGrading(submission.id, documentContent, promptText, cefrLevel);

    // Return the submission ID immediately
    return NextResponse.json({ submissionId: submission.id });

  } catch (error) {
    console.error('Error in grade-writing API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Async function to handle the grading process
async function processGrading(submissionId: string, documentContent: string, promptText: string, cefrLevel: string) {
  try {
    // Construct the prompt for the LLM
    const systemPrompt = `You are an experienced English language teacher evaluating a student's writing assignment. The student's current CEFR level is ${cefrLevel}.

Please evaluate the following writing based on these criteria:
- Grammar & Accuracy
- Vocabulary & Word Choice  
- Coherence & Structure
- Task Achievement

Consider the student's CEFR level when providing feedback - be appropriately challenging but supportive.

You must format your response EXACTLY as follows:
- First line: "GRADE: [A/B/C/D/F]"
- Second line: blank
- Remaining lines: Your detailed prose feedback

Original prompt: "${promptText}"

Student's writing:
"${documentContent}"`;

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const fullResponse = chatCompletion.choices[0]?.message?.content || '';

    // Parse the response to extract grade and feedback
    const lines = fullResponse.trim().split('\n');
    const gradeLine = lines[0];
    const gradeMatch = gradeLine.match(/GRADE:\s*([A-F])/i);
    const grade = gradeMatch ? gradeMatch[1].toUpperCase() : null;
    
    // Find the feedback text (everything after the blank line)
    let feedbackStartIndex = 1;
    while (feedbackStartIndex < lines.length && lines[feedbackStartIndex].trim() === '') {
      feedbackStartIndex++;
    }
    const feedbackText = lines.slice(feedbackStartIndex).join('\n').trim();

    // Update the submission with the results
    await supabaseServiceRole
      .from('grading_submissions')
      .update({
        grade,
        feedback_text: feedbackText,
        status: 'complete'
      })
      .eq('id', submissionId);

  } catch (error) {
    console.error('Error in grading process:', error);
    
    // Update submission status to failed
    await supabaseServiceRole
      .from('grading_submissions')
      .update({ status: 'failed' })
      .eq('id', submissionId);
  }
} 
