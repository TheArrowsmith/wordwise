'use client';

import React from 'react';
import { SuggestionProvider } from '@/contexts/SuggestionContext';
import { WritingEditor } from '@/components/editor/WritingEditor';
import { SuggestionPanel } from '@/components/editor/SuggestionPanel';
import { SuggestionTooltip } from '@/components/editor/SuggestionTooltip';

export default function EditorPage() {
  return (
    <SuggestionProvider>
      <div className="min-h-screen bg-gray-50">
        <SuggestionTooltip>
          <div className="flex h-screen">
            <WritingEditor />
            <SuggestionPanel />
          </div>
        </SuggestionTooltip>
      </div>
    </SuggestionProvider>
  );
} 