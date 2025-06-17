'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CEFRSelector from '@/components/CEFRSelector';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Profile() {
  const [email, setEmail] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('No authenticated user found');
        }

        setEmail(user.email || '');

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('cefr_level')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist yet, use default
            setSelectedLevel('A1');
          } else {
            throw error;
          }
        } else {
          setSelectedLevel(profile.cefr_level || 'A1');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
      setInitialLoading(false);
    };

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            cefr_level: selectedLevel,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) throw error;

      setSuccess('Profile updated successfully!');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
    setLoading(false);
  };

  if (initialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
        <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="mt-2 text-lg text-gray-600">Manage your learning preferences</p>
          </div>
          
          <form onSubmit={handleSave} className="space-y-8">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                readOnly
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-500 bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-4">
                English Level (CEFR)
              </label>
              <CEFRSelector
                selectedLevel={selectedLevel}
                onLevelChange={setSelectedLevel}
                className="w-full"
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-center bg-red-50 p-3 rounded-md">
                {error}
              </p>
            )}
            
            {success && (
              <p className="text-green-600 text-center bg-green-50 p-3 rounded-md">
                {success}
              </p>
            )}
            
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
} 