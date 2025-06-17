'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import CEFRSelector from '@/components/CEFRSelector';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Onboarding() {
  const [selectedLevel, setSelectedLevel] = useState('A1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkExistingProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (profile) {
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
      setCheckingProfile(false);
    };

    checkExistingProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      const { error } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            cefr_level: selectedLevel,
          }
        ]);

      if (error) throw error;

      router.push('/editor');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
    setLoading(false);
  };

  if (checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600">Checking profile...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
        <div className="w-full max-w-2xl space-y-8 rounded-lg bg-white p-8 shadow-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Welcome!</h1>
            <p className="mt-2 text-lg text-gray-600">How good is your English?</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <CEFRSelector
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
              className="w-full"
            />
            
            {error && (
              <p className="text-red-500 text-center bg-red-50 p-3 rounded-md">
                {error}
              </p>
            )}
            
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Getting Started...' : 'Get Started'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
} 