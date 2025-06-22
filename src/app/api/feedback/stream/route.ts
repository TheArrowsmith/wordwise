import { NextRequest } from 'next/server';
import { openai } from '@/lib/openai';
import { createClient } from '@supabase/supabase-js';

// Use the Edge Runtime for streaming
export const runtime = 'edge';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json();

    if (!submissionId) {
      return new Response(JSON.stringify({ error: 'Missing submissionId' }), { status: 400 });
    }

    // Fetch submission data from Supabase
    const { data: submission, error: fetchError } = await supabaseServiceRole
      .from('grading_submissions')
      .select('raw_document_content, raw_prompt_text, cefr_level_at_submission')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404 });
    }

    const { raw_document_content, raw_prompt_text, cefr_level_at_submission } = submission;

    // Construct the prompt for the LLM
    const systemPrompt = `You are an experienced English language teacher evaluating a student's writing assignment. The student's current CEFR level is ${cefr_level_at_submission}.

Please evaluate the following writing based on these criteria:
- Grammar & Accuracy
- Vocabulary & Word Choice  
- Coherence & Structure
- Task Achievement

Consider the student's CEFR level when providing feedback - be appropriately challenging but supportive.

You must format your response EXACTLY as follows:
- First line: "GRADE: [A/B/C/D/F]"
- Second line: blank
- Remaining lines: Your detailed prose feedback in Markdown.

Original prompt: "${raw_prompt_text}"

Student's writing:
"${raw_document_content}"`;

    // Call OpenAI API with streaming enabled
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    let fullResponse = '';
    const encoder = new TextEncoder();

    // Create a ReadableStream to send to the client
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          controller.enqueue(encoder.encode(content));
        }
        
        // When the stream is finished, update the database
        try {
          const lines = fullResponse.trim().split('\n');
          const gradeLine = lines[0];
          const gradeMatch = gradeLine.match(/GRADE:\s*([A-F])/i);
          const grade = gradeMatch ? gradeMatch[1].toUpperCase() : null;
          
          let feedbackStartIndex = 1;
          while (feedbackStartIndex < lines.length && lines[feedbackStartIndex].trim() === '') {
            feedbackStartIndex++;
          }
          const feedbackText = lines.slice(feedbackStartIndex).join('\n').trim();

          await supabaseServiceRole
            .from('grading_submissions')
            .update({
              grade,
              feedback_text: feedbackText,
              status: 'complete',
            })
            .eq('id', submissionId);

        } catch (dbError) {
          console.error('Error updating submission after stream:', dbError);
           await supabaseServiceRole
            .from('grading_submissions')
            .update({ status: 'failed' })
            .eq('id', submissionId);
        }

        controller.close();
      }
    });

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('Streaming API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
} 