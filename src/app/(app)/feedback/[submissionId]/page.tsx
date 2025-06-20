'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        const { data, error } = await supabase
          .from('grading_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();

        if (error) throw error;

        if (data) {
          setSubmission(data);
          setDocumentId(data.document_id);
          
          // If the submission is complete, show the final feedback
          if (data.status === 'complete' && data.feedback_text) {
            setStreamingText(data.feedback_text);
            setIsStreaming(false);
          } else if (data.status === 'processing') {
            // If still processing, show loading state and poll for updates
            setIsStreaming(true);
          } else if (data.status === 'failed') {
            setError('An error occurred while grading your submission. Please try again.');
            setIsStreaming(false);
          }
        }
      } catch (err) {
        console.error('Error loading submission:', err);
        setError('Failed to load submission details.');
        setIsStreaming(false);
      }
    };

    if (submissionId) {
      loadSubmission();
    }
  }, [submissionId]);

  // Poll for updates when submission is processing
  useEffect(() => {
    if (!submission || submission.status !== 'processing') return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('grading_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();

        if (error) throw error;

        if (data && data.status !== 'processing') {
          setSubmission(data);
          if (data.status === 'complete' && data.feedback_text) {
            setStreamingText(data.feedback_text);
            setIsStreaming(false);
          } else if (data.status === 'failed') {
            setError('An error occurred while grading your submission. Please try again.');
            setIsStreaming(false);
          }
        }
      } catch (err) {
        console.error('Error polling submission:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [submission, submissionId]);

  const handleBackToEditor = () => {
    if (documentId) {
      router.push(`/editor?id=${documentId}`);
    } else {
      router.push('/editor');
    }
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

  if (!submission) {
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
            Submitted on {new Date(submission.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Grade Display */}
        {submission.grade && (
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <div className="text-center">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Overall Grade</h2>
              <div className={`text-6xl font-bold ${getGradeColor(submission.grade)}`}>
                {submission.grade}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Text */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Detailed Feedback</h2>
          <div className="prose max-w-none">
            {isStreaming && !streamingText ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Generating feedback...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {streamingText || submission.feedback_text || 'No feedback available yet.'}
                {isStreaming && (
                  <span className="inline-block w-2 h-5 bg-blue-600 animate-pulse ml-1"></span>
                )}
              </div>
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