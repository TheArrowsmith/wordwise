'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

interface Document {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  prompt_id: string;
  prompts?: {
    cefr_level: string;
    text: string;
  } | null;
}

type SortField = 'title' | 'cefr_level' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, sortField, sortDirection]);

  const fetchDocuments = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('documents')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        prompt_id,
        prompts:prompt_id (
          cefr_level,
          text
        )
      `)
      .eq('user_id', user.id)
      .order(sortField === 'title' ? 'content' : sortField === 'cefr_level' ? 'prompts(cefr_level)' : sortField, 
             { ascending: sortDirection === 'asc' });

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
    }
    
    setLoading(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDocumentClick = (document: Document) => {
    // Store document in localStorage to load in editor
    localStorage.setItem('selectedDocument', JSON.stringify(document));
    window.location.href = '/editor';
  };

  const getTitle = (content: string) => {
    return content.slice(0, 50) + (content.length > 50 ? '...' : '');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortField) {
      case 'title':
        aValue = a.content.toLowerCase();
        bValue = b.content.toLowerCase();
        break;
      case 'cefr_level':
        aValue = a.prompts?.cefr_level || '';
        bValue = b.prompts?.cefr_level || '';
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return <span className="text-gray-700">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

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
                  className="hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Editor
                </Link>
                <Link 
                  href="/documents" 
                  className="bg-gray-900 px-3 py-2 rounded-md text-sm font-medium"
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
              <div className="flex items-center">
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
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
              <Link
                href="/editor"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Add New Document
              </Link>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-lg text-gray-600">Loading...</div>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">No documents found</div>
                <Link
                  href="/editor"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-sm font-medium"
                >
                  Create Your First Document
                </Link>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Title</span>
                            <SortIcon field="title" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('cefr_level')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>CEFR Level</span>
                            <SortIcon field="cefr_level" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('created_at')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Creation Date</span>
                            <SortIcon field="created_at" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedDocuments.map((document) => (
                        <tr 
                          key={document.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleDocumentClick(document)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {getTitle(document.content)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {document.prompts?.cefr_level || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(document.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 