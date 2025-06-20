`tasks-prd-graded-submissions.md`

## Relevant Files

-   `src/app/api/create-submission/route.ts` - New API route to handle the initial, non-streaming request. It will create a submission record in the database and return the new submission ID.
-   `src/app/api/stream-feedback/[submissionId]/route.ts` - New streaming API route. It will take a submission ID, fetch the required data, call the LLM, stream back the response, and update the database record on completion.
-   `src/app/editor/page.tsx` - To be modified to add the "Submit for Grading" button and the submission history section.
-   `src/app/feedback/[submissionId]/page.tsx` - New dynamic page to display the streamed feedback report to the user.
-   `src/types.ts` - To be modified to add a new `GradingSubmission` type interface for the new database table.
-   **Supabase Admin Panel** - While not a file, it will be used to create the new `grading_submissions` table.

### Notes

-   Unit tests should be created for any new utility functions and for the API route logic where feasible.
-   The OpenAI API key is available as an environment variable: `OPENAI_API_KEY`. The backend should use this to initialize the OpenAI client.
-   The required model is `gpt-4.1-nano`. Please ensure this exact model name is used in the API call.

## Tasks

-   [ ] 1.0 **Setup Backend: Create the database table for storing graded submissions.**
    -   [ ] 1.1 In the Supabase dashboard, create a new table named `grading_submissions`.
    -   [ ] 1.2 Define the columns for the table as specified in the PRD (FR-5.2): `id` (primary key), `document_id` (foreign key to `documents.id`), `user_id` (foreign key to `auth.users.id`), `created_at`, `grade` (char(1), nullable), `feedback_text` (text, nullable), and `cefr_level_at_submission` (varchar).
    -   [ ] 1.3 Add a `status` column (varchar, default 'processing') to track the state of the submission.
    -   [ ] 1.4 In `src/types.ts`, add a new `GradingSubmission` interface that matches the table structure.

-   [ ] 2.0 **Implement Backend Logic: Create the API endpoints.**
    -   [ ] 2.1 Create the non-streaming API route at `src/app/api/create-submission/route.ts`.
    -   [ ] 2.2 This endpoint should handle a POST request containing `documentId`.
    -   [ ] 2.3 Inside this route, fetch the user's profile to get their `cefr_level`.
    -   [ ] 2.4 Insert a new row into the `grading_submissions` table with the `document_id`, `user_id`, `cefr_level_at_submission`, and a `status` of 'processing'.
    -   [ ] 2.5 Return the `id` of the newly created submission as a JSON response (e.g., `{ submissionId: '...' }`).
    -   [ ] 2.6 Create the streaming API route at `src/app/api/stream-feedback/[submissionId]/route.ts`.
    -   [ ] 2.7 This endpoint should fetch the submission record and the associated document content and prompt text using the `submissionId` from the URL.
    -   [ ] 2.8 Construct a system prompt for the LLM as per PRD (FR-4.2), instructing it to act as a teacher and return the grade and feedback in the specified format (`GRADE: [A-F]\n\n...feedback...`).
    -   [ ] 2.9 Initialize the OpenAI client using the `OPENAI_API_KEY` environment variable and call the `gpt-4.1-nano` model with streaming enabled.
    -   [ ] 2.10 Use the Vercel AI SDK's `StreamingTextResponse` to stream the output directly to the client.
    -   [ ] 2.11 Once the stream is complete (`onCompletion`), parse the full text to extract the `grade` and `feedback_text`.
    -   [ ] 2.12 Update the corresponding `grading_submissions` record in the database with the final `grade`, `feedback_text`, and set the `status` to 'complete'.

-   [ ] 3.0 **Enhance Editor Page: Modify the editor UI.**
    -   [ ] 3.1 In `src/app/editor/page.tsx`, add a "Submit for Grading" button to the UI, likely near the save status indicator.
    -   [ ] 3.2 Add state to manage the list of past submissions for the current document (`const [submissionHistory, setSubmissionHistory] = useState([])`).
    -   [ ] 3.3 Create a `useEffect` hook that fetches the submission history from the `grading_submissions` table when the `documentId` is available.
    -   [ ] 3.4 Render the `submissionHistory` as a list below the editor. Each item should be a `<Link>` to its feedback report page (`/feedback/[submissionId]`) and display the grade and creation date.
    -   [ ] 3.5 Add a loading state to the "Submit for Grading" button to prevent multiple clicks while a submission is being created.

-   [ ] 4.0 **Create Feedback Report Page: Build the new page to display the streamed feedback.**
    -   [ ] 4.1 Create the new dynamic page file at `src/app/feedback/[submissionId]/page.tsx`.
    -   [ ] 4.2 Create a client component for this page to handle state and effects.
    -   [ ] 4.3 Use the `useParams` hook from `next/navigation` to get the `submissionId` from the URL.
    -   [ ] 4.4 Use a `useEffect` hook to initiate a `fetch` call to the streaming endpoint (`/api/stream-feedback/[submissionId]`).
    -   [ ] 4.5 Read the stream from the response and append the incoming text to a state variable (e.g., `feedbackText`), causing the UI to update in real-time.
    -   [ ] 4.6 Parse the streamed text to find the `GRADE: [X]` line. When found, extract the grade and display it prominently at the top of the page. The rest of the text is the prose feedback.
    -   [ ] 4.7 Add a "Back to Editor" button that links back to `/editor?id=[documentId]`. You may need to fetch the `documentId` from the submission data first.
    -   [ ] 4.8 Implement basic error handling to display a message if the `fetch` call fails, as per PRD (FR-6.1).

-   [ ] 5.0 **Wire Up End-to-End Flow: Implement client-side submission logic.**
    -   [ ] 5.1 In `src/app/editor/page.tsx`, create an `onClick` handler function for the "Submit for Grading" button.
    -   [ ] 5.2 This handler should make a POST request to the `/api/create-submission` endpoint, sending the current `documentId`.
    -   [ ] 5.3 On receiving a successful response, use the `useRouter` hook from `next/navigation` to navigate the user to the feedback page using the `submissionId` from the response (e.g., `router.push('/feedback/' + submissionId)`).
    -   [ ] 5.4 Ensure the button is disabled while the API call is in progress.
