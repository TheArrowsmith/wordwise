import { Suspense } from 'react';
import { SuggestionProvider } from '@/contexts/SuggestionContext';

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuggestionProvider>
      <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading editor...</div>
      </div>}>
        {children}
      </Suspense>
    </SuggestionProvider>
  );
} 