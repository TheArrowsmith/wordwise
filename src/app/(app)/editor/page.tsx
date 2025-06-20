'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Document, Prompt, Profile, User } from '@/types';
import { SuggestionProvider } from '@/contexts/SuggestionContext';
import { WritingEditor } from '@/components/editor/WritingEditor';
import { SuggestionPanel } from '@/components/editor/SuggestionPanel';
import { SuggestionTooltip } from '@/components/editor/SuggestionTooltip';
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
  const [profile, setProfile] = useState<Pick<Profile, 'cefr_level'> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
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

  // Get user and profile
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('cefr_level')
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
                </div>

                {/* Feedback Panel Column */}
                <div className="lg:w-1/3">
                  <SuggestionPanel />
                </div>
              </div>
            </SuggestionTooltip>
      </div>
    </SuggestionProvider>
  );
} 
