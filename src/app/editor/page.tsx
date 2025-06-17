'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Editor, EditorState, RichUtils, ContentState, convertToRaw, convertFromRaw, CompositeDecorator } from 'draft-js';
import { useDebounce } from 'use-debounce';
import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { 
  BoldIcon, 
  ItalicIcon, 
  ListBulletIcon, 
  NumberedListIcon 
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Document, Prompt, Profile, User, DraftJSContentBlock, DraftJSCallback } from '@/types';
import 'draft-js/dist/Draft.css';
import 'placeholder-loading/dist/css/placeholder-loading.min.css';
import React from 'react';

interface FeedbackSuggestion {
  id: string;
  category: 'spelling' | 'grammar' | 'fluency' | 'clarity';
  message: string;
  explanation: string;
  suggested_fix?: string;
  offset: number;
  length: number;
}

interface FeedbackSpanProps {
  children: React.ReactNode;
  start: number;
}

export default function EditorPage() {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptLoading, setPromptLoading] = useState(true);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Pick<Profile, 'cefr_level'> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [feedbackSuggestions, setFeedbackSuggestions] = useState<FeedbackSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const searchParams = useSearchParams();
  const documentId = searchParams.get('id');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);

  // Get current content as plain text
  const getCurrentText = useCallback(() => {
    return editorState.getCurrentContent().getPlainText();
  }, [editorState]);

  // Debounced text for autosaving
  const [debouncedText] = useDebounce(getCurrentText(), 500);

  // Create decorator for feedback highlighting
  const createDecorator = useCallback(() => {
    const feedbackStrategy = (contentBlock: DraftJSContentBlock, callback: DraftJSCallback) => {
      const text = contentBlock.getText();
      feedbackSuggestions.forEach(suggestion => {
        const start = suggestion.offset;
        const end = start + suggestion.length;
        if (start >= 0 && end <= text.length) {
          callback(start, end);
        }
      });
    };

    const FeedbackSpan = (props: FeedbackSpanProps) => {
      const offset = props.start;
      const suggestion = feedbackSuggestions.find(s => s.offset === offset);
      
      if (!suggestion) return <span>{props.children}</span>;

      const colorMap = {
        spelling: 'border-b-2 border-yellow-400',
        grammar: 'border-b-2 border-red-400',
        fluency: 'border-b-2 border-blue-400',
        clarity: 'border-b-2 border-green-400'
      };

      return (
        <span 
          className={colorMap[suggestion.category]}
          title={suggestion.message}
        >
          {props.children}
        </span>
      );
    };

    return new CompositeDecorator([
      {
        strategy: feedbackStrategy,
        component: FeedbackSpan,
      },
    ]);
  }, [feedbackSuggestions]);

  // Update editor decorator when feedback changes
  useEffect(() => {
    const decorator = feedbackSuggestions.length > 0 ? createDecorator() : null;
    const newEditorState = EditorState.set(editorState, { decorator });
    setEditorState(newEditorState);
  }, [feedbackSuggestions, createDecorator, editorState]);

  // Define functions with useCallback first to avoid declaration order issues
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
            const contentState = convertFromRaw(JSON.parse(data.content));
            setEditorState(EditorState.createWithContent(contentState));
          } catch {
            // Fallback for plain text
            const contentState = ContentState.createFromText(data.content);
            setEditorState(EditorState.createWithContent(contentState));
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
    if (!user || !prompt) return;

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
      const contentRaw = convertToRaw(editorState.getCurrentContent());
      const contentString = JSON.stringify(contentRaw);

      if (currentDocument) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update({
            content: contentString,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentDocument.id);

        if (error) throw error;
      } else {
        // Create new document
        const { data, error } = await supabase
          .from('documents')
          .insert({
            content: contentString,
            prompt_id: prompt.id,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCurrentDocument(data);
          // Update URL to include document ID
          window.history.replaceState({}, '', `/editor?id=${data.id}`);
        }
      }

      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving document:', error);
      setSaveStatus('idle');
    }
  }, [user, prompt, editorState, currentDocument]);

  // Get user and profile
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        
        // Get user profile for CEFR level
        const { data: profileData } = await supabase
          .from('profiles')
          .select('cefr_level')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }
      }
    };
    getUser();
  }, []);

  // Load existing document or get random prompt
  useEffect(() => {
    if (user && profile) {
      if (documentId) {
        loadDocument(documentId);
      } else {
        loadRandomPrompt();
      }
    }
  }, [user, profile, documentId, loadDocument, loadRandomPrompt]);

  // Handle autosaving
  useEffect(() => {
    if (!isInitialLoad && hasUnsavedChanges && debouncedText && user) {
      handleAutoSave();
    }
  }, [debouncedText, hasUnsavedChanges, user, isInitialLoad, handleAutoSave]);

  const handleAnalyzeText = async () => {
    if (!user || !profile || !currentDocument) return;
    
    const text = getCurrentText();
    if (!text.trim()) return;

    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          cefrLevel: profile.cefr_level,
          documentId: currentDocument.id
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze text');
      
      const data = await response.json();
      
      // Store suggestions in React state only
      if (data.suggestions) {
        setFeedbackSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error analyzing text:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditorChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
  };

  const handleKeyCommand = (command: string, editorState: EditorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const toggleInlineStyle = (style: string) => {
    setEditorState(RichUtils.toggleInlineStyle(editorState, style));
  };

  const toggleBlockType = (blockType: string) => {
    setEditorState(RichUtils.toggleBlockType(editorState, blockType));
  };

  const refreshPrompt = () => {
    loadRandomPrompt();
    // Clear current document when getting new prompt
    setCurrentDocument(null);
    setEditorState(EditorState.createEmpty());
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
    setFeedbackSuggestions([]);
    window.history.replaceState({}, '', '/editor');
  };

  const StyleButton = ({ style, icon, active, onToggle }: {
    style: string;
    icon: React.ReactNode;
    active: boolean;
    onToggle: (style: string) => void;
  }) => (
    <button
      className={`p-2 rounded ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
      onMouseDown={(e) => {
        e.preventDefault();
        onToggle(style);
      }}
    >
      {icon}
    </button>
  );

  const BlockStyleButton = ({ style, icon, active, onToggle }: {
    style: string;
    icon: React.ReactNode;
    active: boolean;
    onToggle: (style: string) => void;
  }) => (
    <button
      className={`p-2 rounded ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
      onMouseDown={(e) => {
        e.preventDefault();
        onToggle(style);
      }}
    >
      {icon}
    </button>
  );

  const currentInlineStyle = editorState.getCurrentInlineStyle();
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation Bar */}
        <nav className="bg-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8 items-center">
                <Link 
                  href="/editor" 
                  className="bg-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Editor
                </Link>
                <Link 
                  href="/documents" 
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  My Documents
                </Link>
                <Link 
                  href="/profile" 
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                {saveStatus === 'saving' && (
                  <span className="text-yellow-300 text-sm">Saving...</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-green-300 text-sm">Saved</span>
                )}
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-6">
            {/* Editor Column */}
            <div className="col-span-2 space-y-6">
              {/* Prompt Section */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                {promptLoading ? (
                  <span className="loader"></span>
                ) : prompt ? (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {prompt.cefr_level}
                        </span>
                        <span className="text-gray-500 text-sm">Writing Prompt</span>
                      </div>
                      <p className="text-gray-800 text-lg leading-relaxed">{prompt.text}</p>
                    </div>
                    <button
                      onClick={refreshPrompt}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      title="Get new prompt"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>No prompt available</p>
                  </div>
                )}
              </div>

              {/* Editor Section */}
              <div className="bg-white rounded-lg shadow-sm">
                {/* Toolbar */}
                <div className="border-b border-gray-200 p-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <StyleButton
                      style="BOLD"
                      icon={<BoldIcon className="h-5 w-5" />}
                      active={currentInlineStyle.has('BOLD')}
                      onToggle={toggleInlineStyle}
                    />
                    <StyleButton
                      style="ITALIC"
                      icon={<ItalicIcon className="h-5 w-5" />}
                      active={currentInlineStyle.has('ITALIC')}
                      onToggle={toggleInlineStyle}
                    />
                    <div className="border-l border-gray-300 mx-2"></div>
                    <BlockStyleButton
                      style="unordered-list-item"
                      icon={<ListBulletIcon className="h-5 w-5" />}
                      active={blockType === 'unordered-list-item'}
                      onToggle={toggleBlockType}
                    />
                    <BlockStyleButton
                      style="ordered-list-item"
                      icon={<NumberedListIcon className="h-5 w-5" />}
                      active={blockType === 'ordered-list-item'}
                      onToggle={toggleBlockType}
                    />
                    <div className="border-l border-gray-300 mx-2"></div>
                    <button
                      onClick={handleAnalyzeText}
                      disabled={isAnalyzing || !currentDocument || !getCurrentText().trim()}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <MagnifyingGlassIcon className="h-4 w-4" />
                      <span>{isAnalyzing ? 'Analyzing...' : 'Analyse'}</span>
                    </button>
                  </div>
                </div>

                {/* Editor */}
                <div className="p-6">
                  <div 
                    className="min-h-96 prose max-w-none focus-within:outline-none"
                    style={{ 
                      color: '#1f2937',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <Editor
                      editorState={editorState}
                      onChange={handleEditorChange}
                      handleKeyCommand={handleKeyCommand}
                      placeholder="Start writing your response to the prompt..."
                      spellCheck={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Panel */}
            <div className="bg-white rounded-lg shadow-sm h-fit">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Feedback</h3>
              </div>
              <div className="p-4">
                {feedbackSuggestions.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Click &apos;Analyse&apos; to get writing feedback</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbackSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            suggestion.category === 'spelling' ? 'bg-yellow-100 text-yellow-800' :
                            suggestion.category === 'grammar' ? 'bg-red-100 text-red-800' :
                            suggestion.category === 'fluency' ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {suggestion.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{suggestion.message}</p>
                        <p className="text-xs text-gray-600 mb-3">{suggestion.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 
