'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { supabase } from '@/lib/supabase';
import { DictionaryResponse } from '@/types/dictionary';

interface DictionaryPanelProps {
  nativeLanguage?: string;
}

export function DictionaryPanel({ nativeLanguage }: DictionaryPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DictionaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userNativeLanguage, setUserNativeLanguage] = useState<string | null>(nativeLanguage || null);

  // Debounce the input value by 500ms
  const [debouncedInputValue] = useDebounce(inputValue, 500);

  // Get user's native language if not provided as prop
  useEffect(() => {
    if (!userNativeLanguage) {
      const fetchUserProfile = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('native_language')
            .eq('id', user.id)
            .single();

          if (profile?.native_language) {
            setUserNativeLanguage(profile.native_language);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };

      fetchUserProfile();
    }
  }, [userNativeLanguage]);

  // API call function
  const lookupWord = useCallback(async (word: string) => {
    if (!word.trim() || !userNativeLanguage) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/dictionary', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          word: word.trim(),
          nativeLanguage: userNativeLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dictionary data');
      }

      const data: DictionaryResponse = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Dictionary lookup error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [userNativeLanguage]);

  // Effect to trigger API call when debounced input changes
  useEffect(() => {
    if (debouncedInputValue) {
      lookupWord(debouncedInputValue);
    } else {
      setResults(null);
      setError(null);
    }
  }, [debouncedInputValue, userNativeLanguage, lookupWord]);

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      'es': 'Spanish',
      'de': 'German', 
      'fr': 'French',
      'pt': 'Portuguese'
    };
    return languages[code] || code;
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Dictionary</h2>
        {userNativeLanguage && (
          <p className="text-sm text-gray-500 mt-1">
            English → {getLanguageName(userNativeLanguage)}
          </p>
        )}
        
        {/* Input Field */}
        <div className="mt-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Look up a word..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 min-h-[100px]">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Looking up word...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="py-4">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Results State */}
        {results && !loading && !error && (
          <div className="space-y-4">
            {results.wordFound ? (
              <>
                {/* Word Title */}
                <div className="border-b border-gray-200 pb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{inputValue.toLowerCase()}</h3>
                </div>

                {/* Definitions */}
                {results.definitions.length > 0 && (
                  <div className="space-y-3">
                    {results.definitions.map((def, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-start space-x-2">
                          <span className="text-sm font-medium text-gray-500 italic min-w-0 flex-shrink-0">
                            {def.partOfSpeech.toLowerCase()}
                          </span>
                          <span className="text-gray-700 text-sm leading-relaxed">
                            {def.definition}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Translations */}
                {results.translations.length > 0 && userNativeLanguage && (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Translation ({getLanguageName(userNativeLanguage)}):
                      </p>
                      <p className="text-sm text-gray-600">
                        {results.translations.join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Not Found State */
              <div className="py-4">
                <p className="text-gray-600 text-sm">
                  "{inputValue}" not found. Please check the spelling.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Initial State - when no input and not loading */}
        {!inputValue && !loading && !results && !error && (
          <div className="py-8 text-center">
            <p className="text-gray-500 text-sm">Enter a word to see its definition and translation</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
} 