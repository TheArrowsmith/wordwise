### **Revised Plan: Migrate Tiptap Editor and Preserve Document Lifecycle**

**Objective:** Replace the Draft.js editor in `src/app/editor/page.tsx` with the Tiptap editor from `editor_new`, ensuring that the existing logic for loading documents from a URL and creating new documents is fully preserved and integrated.

**Core Logic to Preserve (This is the most important part):**

The LLM must understand and maintain the following workflow in `src/app/editor/page.tsx`:
1.  **On Page Load:** Check if a `documentId` exists in the URL search parameters.
2.  **If `documentId` EXISTS:**
    *   Call `loadDocument(documentId)` to fetch the document and its content from Supabase.
    *   Populate the `currentDocument` state with the fetched data.
    *   Pass the fetched content to the new `WritingEditor` component.
    *   All subsequent saves will be **updates** to this existing document.
3.  **If `documentId` is ABSENT:**
    *   The `currentDocument` state remains `null`.
    *   Load a random prompt as usual.
    *   The `WritingEditor` will start with empty or default content.
    *   The **very first auto-save** will be a **creation** (`insert`) operation.
    *   Upon successful creation, the app will receive the new document's ID, update the `currentDocument` state, and **update the browser URL** with the new ID (`/editor?id=...`). This ensures all future saves are treated as updates.

---

### **Step-by-Step Implementation Plan**

#### **Step 1: Code & Dependency Cleanup (No Changes)**

1.  **Delete Redundant Files:**
    *   Delete the `src/app/editor_new/` directory.
    *   Delete `src/app/poc_2/page.tsx`, `src/app/quill_poc/page.tsx`, and `backup.tsx`.

2.  **Remove Old Dependencies:**
    *   In `package.json`, remove `draft-js`, `@types/draft-js`, and `immutable`.
    *   Run `npm install` (or your package manager's equivalent).

#### **Step 2: Restructure `src/app/editor/page.tsx`**

1.  **Import New Components:**
    *   In `src/app/editor/page.tsx`, add imports for the Tiptap editor components and context:
        ```typescript
        import { SuggestionProvider } from '@/contexts/SuggestionContext';
        import { WritingEditor } from '@/components/editor/WritingEditor';
        import { SuggestionPanel } from '@/components/editor/SuggestionPanel';
        import { SuggestionTooltip } from '@/components/editor/SuggestionTooltip';
        ```

2.  **Update JSX Layout:**
    *   Wrap the entire page's return statement in `<SuggestionProvider>`.
    *   Inside the `<ProtectedRoute>`, replace the old layout with the new Tiptap-based structure. Keep the navigation bar and the prompt section.

    ```tsx
    // In src/app/editor/page.tsx

    export default function EditorPage() {
      // ... all existing state and logic (useState, useEffects, etc.) ...

      return (
        <ProtectedRoute>
          <SuggestionProvider>
            <div className="min-h-screen bg-gray-100">
              {/* Keep the existing Navigation Bar */}
              <nav> ... </nav>

              <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <SuggestionTooltip>
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Main Editor and Prompt Column */}
                    <div className="flex-grow lg:w-2/3 space-y-6">
                       {/* Keep the existing Prompt Section */}
                       <div className="bg-white rounded-lg shadow-sm p-6"> ... </div>

                       {/* The NEW WritingEditor will go here */}
                       <WritingEditor
                         // Props will be added in the next step
                       />
                    </div>

                    {/* Feedback Panel Column */}
                    <div className="lg:w-1/3">
                      <SuggestionPanel />
                    </div>
                  </div>
                </SuggestionTooltip>
              </main>
            </div>
          </SuggestionProvider>
        </ProtectedRoute>
      );
    }
    ```

#### **Step 3: Connect Data Flow Between `editor/page.tsx` and `WritingEditor`**

1.  **Modify `WritingEditor.tsx` to Accept Props:**
    *   Open `src/components/editor/WritingEditor.tsx`.
    *   Update its props to accept initial content and pass changes back up.
        ```typescript
        // Define props interface
        interface WritingEditorProps {
          initialContent: string | object | null;
          onContentChange: (contentJson: object) => void;
        }

        // Update component signature
        export function WritingEditor({ initialContent, onContentChange }: WritingEditorProps) {
          // ...
        }
        ```
    *   **Handle Initial Content:** In `WritingEditor.tsx`, use a `useEffect` to set the editor's content only once when `initialContent` is first available. This effect must be ableto handle old Draft.js content (plain text or stringified JSON) and new Tiptap content (JSON object).

        ```tsx
        // In WritingEditor.tsx, inside the component
        const [isContentLoaded, setIsContentLoaded] = useState(false);

        useEffect(() => {
          if (editor && initialContent && !isContentLoaded) {
            let contentToSet;
            if (typeof initialContent === 'string') {
              try {
                contentToSet = JSON.parse(initialContent); // Handle stringified JSON
              } catch (e) {
                contentToSet = `<p>${initialContent}</p>`; // Fallback for plain text
              }
            } else {
              contentToSet = initialContent; // Handle Tiptap JSON object
            }
            editor.commands.setContent(contentToSet, false);
            setIsContentLoaded(true);
          }
        }, [editor, initialContent, isContentLoaded]);
        ```
    *   **Report Content Changes:** Modify the `onUpdate` function in the `useEditor` hook to call the `onContentChange` prop.
        ```tsx
        // In useEditor hook in WritingEditor.tsx
        onUpdate: ({ editor }) => {
          onContentChange(editor.getJSON()); // Pass Tiptap JSON up to the parent

          // Debounced analysis logic remains the same
          // ...
        },
        ```

2.  **Pass Props from `editor/page.tsx`:**
    *   In `editor/page.tsx`, create state to hold the content from the editor.
        ```tsx
        const [initialContent, setInitialContent] = useState<string | null>(null);
        const [editorContent, setEditorContent] = useState<object | null>(null);

        const handleContentChange = useCallback((content: object) => {
          setEditorContent(content);
          if (!isInitialLoad) {
            setHasUnsavedChanges(true);
          }
        }, [isInitialLoad]);
        ```
    *   In the `loadDocument` function, set the `initialContent` state with the fetched data.
        ```tsx
        // Inside loadDocument success block
        if (data.content) {
          setInitialContent(data.content);
        }
        ```
    *   Pass the state and handler to the `WritingEditor` component in your JSX.
        ```tsx
        <WritingEditor
          initialContent={initialContent}
          onContentChange={handleContentChange}
        />
        ```

#### **Step 4: Adapt Auto-Saving Logic to Preserve Lifecycle**

1.  **Modify `handleAutoSave` to use `editorContent` state:**
    *   In `editor/page.tsx`, update the `handleAutoSave` function. It should no longer read from Draft.js; it will now use the `editorContent` state which is continuously updated from the Tiptap component.

2.  **Ensure Create vs. Update Logic is Maintained:**
    *   The `handleAutoSave` function already contains the critical `if (currentDocument)` logic. This **must be preserved**. The only change is the source of the content.

    ```tsx
    // In src/app/editor/page.tsx

    // This useEffect triggers the save
    useEffect(() => {
        if (!isInitialLoad && hasUnsavedChanges && editorContent && user) {
          handleAutoSave();
        }
    }, [useDebounce(editorContent, 2000)]); // Use use-debounce hook

    const handleAutoSave = useCallback(async () => {
      // ... (setSaveStatus, etc.) ...
      const contentString = JSON.stringify(editorContent);

      if (currentDocument) {
        // --- UPDATE LOGIC ---
        // This block handles saving an existing document.
        const { error } = await supabase
          .from('documents')
          .update({ content: contentString, updated_at: new Date().toISOString() })
          .eq('id', currentDocument.id);
        // ... (error handling and setting save status)
      } else {
        // --- CREATE LOGIC ---
        // This block handles the first save of a new document.
        const { data, error } = await supabase
          .from('documents')
          .insert({ content: contentString, prompt_id: prompt.id, user_id: user.id })
          .select()
          .single();

        if (data) {
          setCurrentDocument(data); // IMPORTANT: Update state
          // IMPORTANT: Update URL without reloading page
          window.history.replaceState({}, '', `/editor?id=${data.id}`);
        }
        // ... (error handling and setting save status)
      }
      setHasUnsavedChanges(false);
    }, [user, prompt, editorContent, currentDocument]);
    ```

#### **Step 5: Final Cleanup**

1.  **Remove Old Editor Code:**
    *   In `src/app/editor/page.tsx`, delete all remaining code related to Draft.js:
        *   The `editorState` state and all `RichUtils` imports.
        *   All handler functions: `handleEditorChange`, `handleKeyCommand`, `toggleInlineStyle`, etc.
        *   The old `StyleButton`, `BlockStyleButton` components.
        *   The old `createDecorator`, `feedbackSuggestions`, and `handleAnalyzeText` logic (which is now correctly handled by the `SuggestionContext` and its consumers).
2.  **Verify UI and Functionality:**
    *   Test loading the `/editor` page with and without an `?id=` parameter to confirm both new document creation and existing document loading work perfectly.
    *   Confirm that auto-saving works for both scenarios.
    *   Confirm that Tiptap's toolbar and feedback highlighting work as expected.
