'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { DocumentWithPromptPartial, User, EditorBlock, CEFRLevel } from '@/types';
import Pagination from '@/components/Pagination';
import Icon from '@/components/Icon';

type SortField = 'title' | 'cefr_level' | 'created_at' | 'updated_at';
type SortDirection = 'asc' | 'desc';

// Type for the Supabase query response
type DocumentQueryResult = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  prompt_id: string;
  prompts: {
    cefr_level: CEFRLevel;
    text: string;
  }[] | null;
};

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read state from URL or set defaults
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortField = (searchParams.get('sortField') as SortField) || 'updated_at';
  const sortDirection = (searchParams.get('sortDirection') as SortDirection) || 'desc';

  const [documents, setDocuments] = useState<DocumentWithPromptPartial[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const extractTextFromEditorContent = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      
      // Handle Tiptap JSON format
      if (parsed.type === 'doc' && parsed.content) {
        let text = '';
        const traverse = (node: { type?: string; text?: string; content?: unknown[] }) => {
          if (node.type === 'text' && node.text) {
            text += node.text;
          } else if (node.content) {
            node.content.forEach((child) => traverse(child as { type?: string; text?: string; content?: unknown[] }));
          }
          if (node.type === 'paragraph' || node.type === 'heading') {
            text += ' ';
          }
        };
        
        parsed.content.forEach(traverse);
        return text.trim();
      }
      
      // Fallback for old Draft.js format
      const blocks = parsed.blocks || [];
      const text = blocks.map((block: EditorBlock) => block.text || '').join(' ').trim();
      return text;
    } catch {
      // Fallback to treating as plain text if JSON parsing fails
      return content;
    }
  };

  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    // For title and cefr_level sorting, we need to fetch all documents and sort client-side
    // For created_at and updated_at, we can use database sorting with pagination
    const needsClientSorting = sortField === 'title' || sortField === 'cefr_level';
    
    let query = supabase
      .from('documents')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        prompt_id,
        prompts!prompt_id (
          cefr_level,
          text
        )
      `, { count: 'exact' })
      .eq('user_id', user.id);

    // Apply database sorting and pagination only for database fields
    if (!needsClientSorting) {
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query
        .order(sortField, { ascending: sortDirection === 'asc' })
        .range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
      setTotalDocuments(0);
    } else {
      // Transform data to match expected interface
      let transformedData = (data || []).map((doc: DocumentQueryResult): DocumentWithPromptPartial => ({
        id: doc.id,
        user_id: user.id,
        content: doc.content,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        prompt_id: doc.prompt_id,
        prompts: Array.isArray(doc.prompts) ? (doc.prompts.length > 0 ? doc.prompts[0] : null) : doc.prompts
      }));

      // Apply client-side sorting for title and cefr_level
      if (needsClientSorting) {
        transformedData = transformedData.sort((a, b) => {
          let aValue, bValue;
          
          switch (sortField) {
            case 'title':
              aValue = extractTextFromEditorContent(a.content).toLowerCase();
              bValue = extractTextFromEditorContent(b.content).toLowerCase();
              break;
            case 'cefr_level':
              aValue = a.prompts?.cefr_level || '';
              bValue = b.prompts?.cefr_level || '';
              break;
            default:
              return 0;
          }
          
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });

        // Apply pagination after sorting
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage;
        transformedData = transformedData.slice(from, to);
      }

      setDocuments(transformedData);
      setTotalDocuments(count || 0);
    }
    
    setLoading(false);
  }, [user, page, sortField, sortDirection]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, page, sortField, sortDirection, fetchDocuments]);

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortField', field);
    params.set('sortDirection', newDirection);
    params.set('page', '1'); // Reset to the first page when sorting
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation(); // VERY IMPORTANT: Prevent row click navigation

    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        const { error } = await supabase.from('documents').delete().eq('id', docId);
        if (error) throw error;
        
        // Remove document from local state to update UI instantly
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
        setTotalDocuments(prevTotal => prevTotal - 1);

      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document. Please try again.');
      }
    }
  };

  const handleDocumentClick = (document: DocumentWithPromptPartial) => {
    // Navigate to editor with document ID as URL parameter
    window.location.href = `/editor?id=${document.id}`;
  };

  const getTitle = (content: string) => {
    const text = extractTextFromEditorContent(content);
    return text.slice(0, 50) + (text.length > 50 ? '...' : '');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return <span className="text-gray-700">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
              <div className="bg-white shadow overflow-hidden">
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
                            <span>Created</span>
                            <SortIcon field="created_at" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('updated_at')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Updated</span>
                            <SortIcon field="updated_at" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          <span>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documents.map((document) => (
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
                            {formatDateTime(document.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(document.updated_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => handleDelete(e, document.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100"
                              title="Delete document"
                            >
                              <Icon name="trash" size="sm" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={page}
                  totalItems={totalDocuments}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
    </div>
  );
} 
