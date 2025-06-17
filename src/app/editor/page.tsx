'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Editor, EditorState, RichUtils, ContentState, convertToRaw, convertFromRaw } from 'draft-js';
import { useDebounce } from 'use-debounce';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
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
import { Document, Prompt, Profile } from '@/types';
import 'draft-js/dist/Draft.css';

export default function EditorPage() {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Pick<Profile, 'cefr_level'> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
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
  }, [user, profile, documentId]);

  // Handle autosaving
  useEffect(() => {
    if (!isInitialLoad && hasUnsavedChanges && debouncedText && user) {
      handleAutoSave();
    }
  }, [debouncedText, hasUnsavedChanges, user, isInitialLoad]);

  const loadDocument = async (docId: string) => {
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
      loadRandomPrompt(); // Fallback to random prompt
    } finally {
      setIsInitialLoad(false);
    }
  };

  const loadRandomPrompt = async () => {
    if (!profile) return;

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
      setIsInitialLoad(false);
    }
  };

  const handleAutoSave = async () => {
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

        console.log(2)
        console.log(error)

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

        console.log(1)
        console.log(error)

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
                <h1 className="text-xl font-semibold">Arrowsmith</h1>
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
        <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Prompt Section */}
          {prompt && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
            </div>
          )}

          {/* Editor Section */}
          <div className="bg-white rounded-lg shadow-sm">
            {/* Toolbar */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex flex-wrap gap-2">
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
              </div>
            </div>

            {/* Editor */}
            <div className="p-6">
              <div 
                className="min-h-96 prose max-w-none focus-within:outline-none"
                style={{ 
                  color: '#1f2937', // Dark gray text for readability
                  backgroundColor: '#ffffff' // White background
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
        </main>
      </div>
    </ProtectedRoute>
  );
} 
