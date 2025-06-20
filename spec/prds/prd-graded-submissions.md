# **PRD: Graded Submissions Feature**

### **1. Introduction/Overview**

This document outlines the requirements for the "Graded Submissions" feature. The goal is to provide users of WordWise with a way to receive formal, summative feedback on their writing. Users will be able to submit their document for evaluation by an AI, which will act as an English language teacher. The AI will provide a letter grade and qualitative feedback tailored to the user's specific CEFR level, allowing them to assess their performance and track their improvement on a given writing task.

### **2. Goals**

*   **Provide Summative Evaluation:** Allow users to receive a definitive letter grade (A-F) on their writing.
*   **Offer Actionable Feedback:** Deliver qualitative, prose-based feedback that helps users understand their strengths and weaknesses.
*   **Ensure Context-Awareness:** The AI's feedback and grading must be adjusted based on the user's self-reported CEFR level.
*   **Track Progress:** Enable users to resubmit a document after making edits and view a history of their past grades for that specific document.
*   **Enhance User Experience:** Use streaming to deliver feedback immediately without forcing the user to wait for the full response to generate.

### **3. User Stories**

*   **As a user,** I want to submit my writing for a grade so that I can get a clear, teacher-like assessment (appropriate for my current CEFR level) of my performance on the writing prompt.
*   **As a user,** I want the feedback to appear word-by-word so I don't have to stare at a loading spinner and can start reading as soon as it's available.
*   **As a user,** I want to view my past grades for a document so I can see if the changes I made to my writing resulted in a better score.
*   **As a user,** after viewing my grade, I want to easily navigate back to the editor to make improvements to my document.

### **4. Functional Requirements**

**FR-1: Editor Page UI**
1.1. The Editor page must include a **"Submit for Grading"** button below the editor.
1.2. A section must be added to the Editor page to display a **history of past submissions** for the current document.
    - This section should only be visible if the document has at least one submission.
    - Each item in the history should display the grade and the submission date (e.g., "Grade: B - Submitted on 2024-10-26").
    - Each history item should link to its corresponding Feedback Report page.
    - This section appears below the editor.

**FR-2: Submission & Navigation**
2.1. Clicking "Submit for Grading" will trigger an API call to a new backend endpoint.
2.2. The API request must include the current document content, the associated prompt's text, and the user's CEFR level from their profile.
2.3. After the request is initiated, the user must be navigated to a new, unique URL for the feedback report (e.g., `/feedback/[submission_id]`).

**FR-3: Feedback Report Page**
3.1. The page must display the AI-generated feedback as it is **streamed** from the backend.
3.2. Once the stream is complete, the page must clearly display two final components:
    - **Overall Grade:** A single letter from A, B, C, D, or F.
    - **Prose Feedback:** A single block of text containing the qualitative feedback.
3.3. The page must contain a **"Back to Editor"** button that navigates the user back to the editor page for the original document.

**FR-4: Backend API Endpoint (`/api/grade-writing`)**
4.1. The endpoint must accept the document content, prompt text, and user's CEFR level.
4.2. It must construct a detailed prompt for the LLM, instructing it to:
    - Act as an English language teacher evaluating a student's assignment.
    - Take the user's CEFR level into account to provide level-appropriate feedback.
    - Evaluate the writing on the criteria of **Grammar & Accuracy, Vocabulary & Word Choice, Coherence & Structure,** and **Task Achievement**.
    - Return a response in a specific, parsable format: the first line must be `GRADE: [A-F]`, followed by a blank line, and then the prose feedback.
4.3. The endpoint will use the GPT 4.1 nano model
4.4. The endpoint must **stream** the response back to the client in real-time.
4.5. Upon successful completion of the LLM stream, the full response (grade and feedback text) must be saved to the `grading_submissions` table in the database.

**FR-5: Data Persistence**

5.1. A new table named `grading_submissions` must be created in the Supabase database.
5.2. The table schema must include at least: `id`, `document_id` (foreign key to `documents`), `user_id`, `created_at`, `grade` (char(1)), `feedback_text` (text), and `cefr_level_at_submission` (varchar).
5.3. A new submission **must not** overwrite a previous one. Each submission creates a new record.

```sql
-- Step 1: Create the new table for graded submissions
CREATE TABLE public.grading_submissions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    grade char(1) NULL,
    feedback_text text NULL,
    cefr_level_at_submission character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'processing'::character varying,
    CONSTRAINT grading_submissions_pkey PRIMARY KEY (id),
    CONSTRAINT grading_submissions_status_check CHECK (((status)::text = ANY (ARRAY[('processing'::character varying)::text, ('complete'::character varying)::text, ('failed'::character varying)::text]))),
    CONSTRAINT grading_submissions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE,
    CONSTRAINT grading_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Step 2: Enable Row-Level Security (RLS) on the new table
ALTER TABLE public.grading_submissions ENABLE ROW LEVEL SECURITY;

-- Step 3: Create security policies to control access
-- Policy: Allow users to view their own submissions
CREATE POLICY "Enable read access for authenticated users on their own submissions"
ON public.grading_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow users to create new submissions for themselves
CREATE POLICY "Enable insert for authenticated users for their own submissions"
ON public.grading_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow the server (using service_role key) to update submission status
-- Note: The backend API will need to use the service_role key to bypass RLS for updates.
CREATE POLICY "Enable update for service_role only"
ON public.grading_submissions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Add comments on the table and columns for clarity
COMMENT ON TABLE public.grading_submissions IS 'Stores results of AI-graded writing submissions.';
COMMENT ON COLUMN public.grading_submissions.cefr_level_at_submission IS 'The user''s CEFR level at the time of submission.';
COMMENT ON COLUMN public.grading_submissions.status IS 'Tracks the state of the grading process (processing, complete, failed).';
```

**FR-6: Error Handling**
6.1. In case of an API or LLM error, the Feedback Report page should display a simple, static error message (e.g., "An error occurred while grading your submission. Please try again.").
6.2. An option to "Try Again" or "Back to Editor" should be provided.

### **5. Non-Goals (Out of Scope for V1)**

*   Comparing grades between different submissions (e.g., showing "+1 grade improvement").
*   A rigidly structured feedback report with separate sections for each criterion.
*   Complex, automatic retry logic on the frontend or backend.
*   Allowing the user to dispute or provide feedback on their grade.

### **6. Design & Technical Considerations**

*   **UI/UX:** The Feedback Report page should prioritize readability. The streaming text should be immediately engaging. Consider a subtle loading indicator on the "Submit for Grading" button to prevent double-clicks.
*   **Streaming:** The Vercel AI SDK is recommended for implementing the streaming functionality between the Next.js server and the client.
*   **OpenAI API**. An OpenAI client is initialized in `lib/openai.ts` - use this rather than initializing a new client.
*   **Prompt Engineering:** Careful prompt engineering will be crucial to ensure the LLM consistently returns the grade and feedback in the specified format (`GRADE: [X]\n\n...feedback...`).
*   **Database:** Ensure the `grading_submissions` table has the correct foreign key constraints and indexes for efficient querying.
