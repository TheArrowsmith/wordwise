'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GradingSubmission } from '@/types';

export default function FeedbackReportPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  
  const [submission, setSubmission] = useState<GradingSubmission | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  // Add this line
  const abortControllerRef = useRef<AbortController | null>(null);



  useEffect(() => {
    // Cancel any previous stream when the effect runs
    abortControllerRef.current?.abort();

    // Create a new controller for the new request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const fetchAndStreamFeedback = async () => {
      setIsStreaming(true);
      try {
        const response = await fetch('/api/feedback/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ submissionId }),
          signal, // Pass the signal to the fetch request
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to start streaming feedback.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setStreamingText((prev) => prev + chunk);
        }

      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.log('Stream fetch aborted.');
          return; // This is an expected error when we cancel, so we ignore it.
        }
        console.error('Error streaming feedback:', err);
        setError('An error occurred while generating your feedback. Please try again.');
      } finally {
        setIsStreaming(false);
      }
    };

    const loadSubmission = async () => {
      if (!submissionId) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('grading_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();

        if (fetchError) throw fetchError;

        if (data) {
          setSubmission(data);
          setDocumentId(data.document_id);
          
          if (data.status === 'complete' && data.feedback_text) {
            setStreamingText(data.feedback_text);
            setIsStreaming(false);
          } else if (data.status === 'processing') {
            fetchAndStreamFeedback();
          } else if (data.status === 'failed') {
            setError('An error occurred while grading your submission. Please try again.');
            setIsStreaming(false);
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            console.error('Error loading submission:', err);
            setError('Failed to load submission details.');
            setIsStreaming(false);
        }
      }
    };

    loadSubmission();

    // The cleanup function: this is crucial.
    // It runs when the component unmounts or before the effect runs again.
    return () => {
      abortControllerRef.current?.abort();
    };
    
    // The dependency array is now just submissionId, as fetchAndStreamFeedback is defined inside
  }, [submissionId]);

  const handleBackToEditor = () => {
    if (documentId) {
      router.push(`/editor?id=${documentId}`);
    } else {
      router.push('/editor');
    }
  };

  const extractGradeFromStream = (text: string) => {
    const match = text.match(/GRADE:\s*([A-F])/i);
    return match ? match[1].toUpperCase() : null;
  };

  const extractFeedbackFromStream = (text: string) => {
    const lines = text.split('\n');
    const gradeLineIndex = lines.findIndex(line => line.match(/GRADE:\s*([A-F])/i));
    if (gradeLineIndex === -1) {
        return text;
    }
    // Find the start of the feedback text (skipping the grade line and any blank lines after it)
    let feedbackStartIndex = gradeLineIndex + 1;
    while(feedbackStartIndex < lines.length && lines[feedbackStartIndex].trim() === '') {
        feedbackStartIndex++;
    }
    return lines.slice(feedbackStartIndex).join('\n');
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'text-gray-500';
    switch (grade.toUpperCase()) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'F': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const grade = submission?.grade || extractGradeFromStream(streamingText);
  const feedbackText = extractFeedbackFromStream(streamingText || submission?.feedback_text || '');

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Feedback Report</h1>
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
            <div className="space-x-4">
              <button
                onClick={handleBackToEditor}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Back to Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission && !isStreaming) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Report</h1>
          <p className="text-gray-600">
            {submission && `Submitted on ${new Date(submission.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`}
          </p>
        </div>

        {/* Grade Display */}
        {grade && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <div className="text-center">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Overall Grade</h2>
              <div className={`text-6xl font-bold ${getGradeColor(grade)}`}>
                {grade}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Text */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Feedback</h2>
          <div className="prose prose-gray max-w-none">
            {isStreaming && !streamingText ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Generating feedback...</span>
              </div>
            ) : (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {feedbackText || 'No feedback available yet.'}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-5 bg-blue-600 animate-pulse ml-1"></span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Back to Editor Button */}
        <div className="flex justify-center pt-6 border-t border-gray-200">
          <button
            onClick={handleBackToEditor}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
          >
            Back to Editor
          </button>
        </div>
      </div>
    </div>
  );
} 