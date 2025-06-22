'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { SuggestionExtension } from './SuggestionExtension';
import { 
  BoldIcon, 
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  NumberedListIcon
} from '@heroicons/react/24/outline';

interface WritingEditorProps {
  initialContent?: string | object | null;
  onContentChange?: (content: object) => void;
}

export function WritingEditor({ initialContent, onContentChange }: WritingEditorProps) {
  const { suggestions, analyzText, setHoveredSuggestion, setSuggestions } = useSuggestions();
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      Highlight,
      Underline,
      Placeholder.configure({
        placeholder: 'Type your response here…',
      }),
      SuggestionExtension.configure({
        suggestions,
        onHover: setHoveredSuggestion,
      }),
    ],
    editorProps: {
      attributes: {
        class: 'mx-auto focus:outline-none min-h-[400px] text-gray-900 text-base leading-relaxed',
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      // Clear existing suggestions immediately on any change.
      setSuggestions([]);

      const documentJSON = editor.getJSON();
      const text = editor.getText();
      
      // Update word count
      const words = text.trim().split(/\s+/);
      setWordCount(text.trim() === '' ? 0 : words.length);
      
      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Debounce analysis by 300ms
      debounceRef.current = setTimeout(() => {
        analyzText(documentJSON);
      }, 300);

      // Notify parent of content changes
      if (onContentChange) {
        onContentChange(editor.getJSON());
      }
    },
  });

  // Handle initial content
  useEffect(() => {
    if (editor && initialContent && !isContentLoaded) {
      let contentToSet;
      if (typeof initialContent === 'string') {
        try {
          contentToSet = JSON.parse(initialContent); // Handle stringified JSON
        } catch {
          contentToSet = `<p>${initialContent}</p>`; // Fallback for plain text
        }
      } else {
        contentToSet = initialContent; // Handle Tiptap JSON object
      }
      editor.commands.setContent(contentToSet, false);
      setIsContentLoaded(true);
    }
  }, [editor, initialContent, isContentLoaded]);

  // Update suggestions in editor when they change
  useEffect(() => {
    if (editor && suggestions) {
      // Reconfigure the extension with new suggestions
      editor.extensionManager.extensions.forEach((extension) => {
        if (extension.name === 'suggestions') {
          extension.options.suggestions = suggestions;
        }
      });
      
      // Force editor update
      editor.view.dispatch(editor.view.state.tr);
    }
  }, [editor, suggestions]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const setHeading = useCallback((level: 1 | 2 | 3) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white shadow-sm">
      {/* Editor Header */}
      <div className="border-b border-gray-200 p-4">
        {/* Toolbar */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-3">
            <button
              onClick={() => setHeading(1)}
              className={`px-2 py-1 text-sm font-medium rounded ${
                editor.isActive('heading', { level: 1 })
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              H1
            </button>
            <button
              onClick={() => setHeading(2)}
              className={`px-2 py-1 text-sm font-medium rounded ${
                editor.isActive('heading', { level: 2 })
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              H2
            </button>
            <button
              onClick={() => setHeading(3)}
              className={`px-2 py-1 text-sm font-medium rounded ${
                editor.isActive('heading', { level: 3 })
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              H3
            </button>
          </div>
          
          <div className="flex items-center space-x-1 border-r border-gray-200 pr-3">
            <button
              onClick={toggleBold}
              className={`p-2 rounded ${
                editor.isActive('bold')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BoldIcon className="h-4 w-4" />
            </button>
            <button
              onClick={toggleItalic}
              className={`p-2 rounded ${
                editor.isActive('italic')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ItalicIcon className="h-4 w-4" />
            </button>
            <button
              onClick={toggleUnderline}
              className={`p-2 rounded ${
                editor.isActive('underline')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <UnderlineIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleBulletList}
              className={`p-2 rounded ${
                editor.isActive('bulletList')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
            <button
              onClick={toggleOrderedList}
              className={`p-2 rounded ${
                editor.isActive('orderedList')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <NumberedListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="flex-1 p-6 overflow-y-auto relative">
        <EditorContent 
          editor={editor} 
          className="min-h-full focus-within:outline-none"
        />
        <div className="absolute bottom-2 right-2 text-sm text-gray-500 bg-white/80 px-2 py-1 rounded-md shadow-sm">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      </div>
    </div>
  );
} 
