'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AppLayoutProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export default function AppLayout({ children, headerContent }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              {/* Brand */}
              <div className="flex items-center space-x-2">
                <span className="text-xl">🫨🍐</span>
                <span className="text-xl font-semibold text-gray-900">Shakes Pear</span>
              </div>
              
              {/* Navigation Links */}
              <nav className="flex space-x-8">
                <Link
                  href="/editor"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/editor')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Editor
                </Link>
                <Link
                  href="/documents"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/documents')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  My Documents
                </Link>
                <Link
                  href="/profile"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/profile')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Profile
                </Link>
              </nav>
            </div>
            
            {/* Header Content and Sign Out Button */}
            <div className="flex items-center space-x-4">
              {headerContent}
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main>
        {children}
      </main>
    </div>
  );
} 
