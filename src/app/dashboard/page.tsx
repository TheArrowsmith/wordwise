'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth/signin';
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md">
          <h1 className="text-2xl font-bold text-center text-gray-900">Dashboard</h1>
          <p className="text-center text-gray-800">Welcome to your dashboard!</p>
          <button
            onClick={handleSignOut}
            className="w-full rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
} 