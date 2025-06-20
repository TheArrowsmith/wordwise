'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Document, Prompt, Profile, User, GradingSubmission } from '@/types';
import { SuggestionProvider } from '@/contexts/SuggestionContext';
import { WritingEditor } from '@/components/editor/WritingEditor';
import { SuggestionPanel } from '@/components/editor/SuggestionPanel';
import { SuggestionTooltip } from '@/components/editor/SuggestionTooltip';
import { DictionaryPanel } from '@/components/editor/DictionaryPanel';
import 'placeholder-loading/dist/css/placeholder-loading.min.css';
import React from 'react';

// interface FeedbackSuggestion {
//   id: string;
//   category: 'spelling' | 'grammar' | 'fluency' | 'clarity';
//   message: string;
//   explanation: string;
//   suggested_fix?: string;
//   offset: number;
//   length: number;
// }

export default function EditorPage() {
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<object | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptLoading, setPromptLoading] = useState(true);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Pick<Profile, 'cefr_level' | 'native_language'> | null>(null);
  const [, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [submissions, setSubmissions] = useState<GradingSubmission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const documentId = searchParams.get('id');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);

  const handleContentChange = useCallback((content: object) => {
    setEditorContent(content);
    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
  }, [isInitialLoad]);

  const loadDocument = useCallback(async (docId: string) => {
    if (!user) return;
    
    setPromptLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          prompts!inner(*)
        `)
        .eq('id', docId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentDocument(data);
        setPrompt(data.prompts);
        
        // Load content into editor
        if (data.content) {
          try {
            const parsedContent = JSON.parse(data.content);
            setInitialContent(data.content);
            setEditorContent(parsedContent);
          } catch {
            // Fallback for plain text
            setInitialContent(data.content);
            setEditorContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: data.content }] }] });
          }
        }
      }
    } catch (error) {
      console.error('Error loading document:', error);
      // Don't call loadRandomPrompt here to avoid circular dependency
    } finally {
      setPromptLoading(false);
      setIsInitialLoad(false);
    }
  }, [user]);

  const loadRandomPrompt = useCallback(async () => {
    if (!profile) return;
    setPromptLoading(true);

    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('cefr_level', profile.cefr_level);

      if (error) throw error;

      if (data && data.length > 0) {
        const randomPrompt = data[Math.floor(Math.random() * data.length)];
        setPrompt(randomPrompt);
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
    } finally {
      setPromptLoading(false);
      setIsInitialLoad(false);
    }
  }, [profile]);

  const handleAutoSave = useCallback(async () => {
    if (!user || !prompt || !editorContent) return;

    const now = Date.now();
    if (now - lastSaveRef.current < 1000) {
      // Throttle saves to at most once per second
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 1000 - (now - lastSaveRef.current));
      return;
    }

    lastSaveRef.current = now;
    setSaveStatus('saving');

    try {
      const contentString = JSON.stringify(editorContent);

      if (currentDocument) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update({ content: contentString, updated_at: new Date().toISOString() })
          .eq('id', currentDocument.id);

        if (error) throw error;
      } else {
        // Create new document
        const { data, error } = await supabase
          .from('documents')
          .insert({ content: contentString, prompt_id: prompt.id, user_id: user.id })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setCurrentDocument(data);
          // Update URL without reloading page
          window.history.replaceState({}, '', `/editor?id=${data.id}`);
        }
      }

      setSaveStatus('saved');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving document:', error);
      setSaveStatus('idle');
    }
  }, [user, prompt, editorContent, currentDocument]);

  // Load submissions for the current document
  const loadSubmissions = useCallback(async () => {
    if (!currentDocument) return;

    try {
      const { data, error } = await supabase
        .from('grading_submissions')
        .select('*')
        .eq('document_id', currentDocument.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  }, [currentDocument]);

  // Extract text content from editor JSON
  const extractTextFromEditor = (editorContent: object): string => {
    const content = editorContent as { content?: object[] };
    if (!content || !content.content) return '';
    
    let text = '';
    const traverse = (node: { type?: string; text?: string; content?: object[] }) => {
      if (node.type === 'text' && node.text) {
        text += node.text;
      } else if (node.content) {
        node.content.forEach(traverse);
      }
      if (node.type === 'paragraph' || node.type === 'heading') {
        text += '\n';
      }
    };
    
    content.content.forEach(traverse);
    return text.trim();
  };

  // Handle submission for grading
  const handleSubmitForGrading = async () => {
    if (!currentDocument || !prompt || !profile || !editorContent) return;

    setIsSubmitting(true);
    
    try {
      // Extract text content from the editor
      const documentContent = extractTextFromEditor(editorContent);
      
      if (!documentContent.trim()) {
        alert('Please write some content before submitting for grading.');
        setIsSubmitting(false);
        return;
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to submit for grading.');
        setIsSubmitting(false);
        return;
      }

      // Make API call to grade-writing endpoint
      const response = await fetch('/api/grade-writing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          documentContent,
          promptText: prompt.text,
          cefrLevel: profile.cefr_level,
          documentId: currentDocument.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit for grading');
      }

      // Get the submission ID from the response
      const data = await response.json();
      if (data.submissionId) {
        // Navigate to feedback page
        router.push(`/feedback/${data.submissionId}`);
      } else {
        throw new Error('No submission ID received');
      }
      
    } catch (error) {
      console.error('Error submitting for grading:', error);
      alert('Failed to submit for grading. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get user and profile
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('cefr_level, native_language')
          .eq('id', user.id)
          .single();
        if (profile) {
          setProfile(profile);
        }
      }
    };
    getUser();
  }, []);

  // Load document or random prompt
  useEffect(() => {
    if (!user || !profile) return;

    if (documentId) {
      loadDocument(documentId);
    } else {
      loadRandomPrompt();
    }
  }, [user, profile, documentId, loadDocument, loadRandomPrompt]);

  // Load submissions when document changes
  useEffect(() => {
    if (currentDocument) {
      loadSubmissions();
    }
  }, [currentDocument, loadSubmissions]);

  // Auto-save effect
  const debouncedEditorContent = useDebounce(editorContent, 2000)[0];
  useEffect(() => {
    if (!isInitialLoad && hasUnsavedChanges && editorContent && user) {
      handleAutoSave();
    }
  }, [debouncedEditorContent, isInitialLoad, hasUnsavedChanges, editorContent, user, handleAutoSave]);

  const refreshPrompt = () => {
    if (!profile) return;
    setPrompt(null);
    setPromptLoading(true);
    loadRandomPrompt();
  };

  return (
    <SuggestionProvider>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <SuggestionTooltip>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Editor and Prompt Column */}
                <div className="flex-grow lg:w-2/3 space-y-6">
                  {/* Prompt Section */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-medium text-gray-900">Prompt</h2>
                        {profile?.cefr_level && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {profile.cefr_level.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={refreshPrompt}
                        disabled={promptLoading}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ArrowPathIcon className={`h-5 w-5 ${promptLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    <div className="align-top">
                      {promptLoading ? (
                        <div className="ph-col-12 h-6 mt-2">
                          <div className="ph-row">
                            <div className="ph-col-8 rounded"></div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-800">{prompt?.text}</p>
                      )}
                    </div>
                  </div>

                  {/* Editor */}
                  <WritingEditor
                    initialContent={initialContent}
                    onContentChange={handleContentChange}
                  />

                  {/* Submit for Grading Button */}
                  {currentDocument && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <button
                        onClick={handleSubmitForGrading}
                        disabled={isSubmitting || !editorContent}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting for Grading...
                          </>
                        ) : (
                          'Submit for Grading'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Submission History */}
                  {submissions.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Grading History</h3>
                      <div className="space-y-3">
                        {submissions.map((submission) => (
                          <div
                            key={submission.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => router.push(`/feedback/${submission.id}`)}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`text-lg font-bold ${
                                submission.grade === 'A' ? 'text-green-600' :
                                submission.grade === 'B' ? 'text-blue-600' :
                                submission.grade === 'C' ? 'text-yellow-600' :
                                submission.grade === 'D' ? 'text-orange-600' :
                                submission.grade === 'F' ? 'text-red-600' :
                                'text-gray-500'
                              }`}>
                                {submission.grade || (submission.status === 'processing' ? '...' : '?')}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Grade: {submission.grade || (submission.status === 'processing' ? 'Processing...' : 'Failed')}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Submitted on {new Date(submission.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-gray-400">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Feedback Panel Column */}
                <div className="flex flex-col space-y-6">
                  <DictionaryPanel nativeLanguage={profile?.native_language || undefined} />
                  <SuggestionPanel />
                </div>
              </div>
            </SuggestionTooltip>
      </div>
    </SuggestionProvider>
  );
} 
