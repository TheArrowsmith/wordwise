Product Requirements Document (PRD) for WordWise
1. Overview
1.1 Purpose
WordWise is a web application designed to assist English as a Second Language (ESL) students in improving their English writing skills. It provides a text editor where users can respond to single-sentence writing prompts tailored to their CEFR level (A1–C2), with real-time grammar, spelling, punctuation, and style feedback powered by OpenAI. The app highlights mistakes, offers fluency suggestions, allows word pronunciation via AWS Polly, auto-saves documents, and provides a page to review saved documents.
1.2 Problem Statement
ESL students struggle with English writing due to limited feedback on grammar, vocabulary, and style. Existing tools lack CEFR-specific prompts, pronunciation support, and seamless document management. WordWise addresses this by offering a tailored, interactive writing environment with immediate corrections, fluency suggestions, audio pronunciation, and auto-saving, all in a free, user-friendly app.
1.3 Objectives
Enable ESL students to practice writing with CEFR-level-appropriate, single-sentence prompts.
Provide real-time feedback on spelling, grammar, punctuation, and style using OpenAI.
Offer fluency suggestions to improve natural English expression.
Allow users to hear word pronunciations with AWS Polly’s “Arthur” voice.
Auto-save documents as users type and organize them with metadata for easy access.
Deliver a simple, intuitive UI for A1–C2 learners using React/Next.js.
2. Use Cases
Select CEFR Level:
User selects their CEFR level (A1–C2) during onboarding or profile update.
View and Refresh Writing Prompt:
User sees a random, single-sentence CEFR-tailored prompt and can click “Refresh” (with arrow-path Heroicon) for a new one.
Write in Text Editor:
User types a response, with real-time error highlighting, fluency suggestions, and auto-saving to Supabase.
Hear Word Pronunciation:
User clicks a word to hear it pronounced via AWS Polly’s “Arthur” voice.
View Corrections/Suggestions:
User sees categorized errors and suggestions in a sidebar, with explanations.
Review Documents:
User views a list of saved documents with metadata and can edit them.
Authenticate:
User signs up/logs in with email/password to access their profile and documents.
4. Functional Requirements
4.1 Authentication
F1.1: Users can sign up with email/password via Supabase Auth.
F1.2: Users can log in with email/password.
F1.3: Users can log out.
F1.4: Password reset via email link.
Acceptance Criteria:
Sign-up creates a user profile with email and CEFR level.
Login redirects to the editor page.
Logout clears session and redirects to login page.
Password reset sends an email with a secure link.
4.2 User Profile
F2.1: Users can select their CEFR level (A1–C2) during sign-up or via profile settings.
F2.2: CEFR level is stored in Supabase and used for prompt generation.
Acceptance Criteria:
CEFR level dropdown displays A1, A2, B1, B2, C1, C2.
Selected level persists across sessions.
Default level is B1 if none selected.
4.3 Writing Prompts
F3.1: A random, single-sentence CEFR-tailored prompt (question or instruction) is displayed above the text editor on page load.
F3.2: Users can click a “Refresh” button (with arrow-path Heroicon) to generate a new prompt.
F3.3: Prompts are generated via OpenAI API, tailored to the user’s CEFR level, and varied (e.g., narrative, descriptive, argumentative).
F3.4: Each generated prompt is stored in a Supabase table with CEFR level and creation date.
F3.5: Initial implementation uses only OpenAI-generated prompts.
OpenAI Prompt for Prompt Generation:
Generate a single-sentence writing prompt for an ESL student at CEFR level {cefr_level}. The prompt should be either a question or an instruction, varied in type (e.g., narrative, descriptive, argumentative), and appropriate for the level's vocabulary and grammar complexity. Return the prompt as plain text.


Example: For B1: “Describe your favorite place to relax.”
Acceptance Criteria:
Prompt is a single sentence, appropriate for the CEFR level (e.g., A1 uses simple present, C2 uses complex structures).
“Refresh” generates a new prompt instantly, displayed with arrow-path Heroicon.
Prompts are stored in prompts table with id, text, cefr_level, created_at.
4.4 Text Editor
F4.1: A Draft.js-based text editor allows users to type responses to prompts.
F4.2: Errors (spelling, grammar, punctuation, style) are highlighted in red as the user types, with a 500ms debounce.
F4.3: OpenAI API checks text for errors and fluency suggestions, returning a JSON response with categorized corrections.
F4.4: Clicking a word triggers AWS Polly to play its pronunciation using the “Arthur” voice (British English), with no usage limits.
F4.5: Document auto-saves to Supabase on each debounced text change (500ms).
OpenAI Prompt for Text Checking:
You are an ESL writing assistant for a CEFR level {cefr_level} student. Analyze the following text for spelling, grammar, punctuation, and style errors, and provide fluency suggestions to make the text more natural. Return results in JSON format with categorized errors and fluency suggestions, including offsets, lengths, and plain-English explanations for each error. Do not check for tone.


Text: {text}


Response format:
{
  "errors": [
    {
      "category": "GRAMMAR",
      "message": "Subject-verb agreement error",
      "explanation": "Use a singular verb with a singular subject.",
      "offset": 10,
      "length": 3,
      "suggestions": ["is"],
      "rule_id": "SUBJECT_VERB_AGREEMENT"
    }
  ],
  "fluency_suggestions": [
    {
      "original": "He run fast",
      "suggested": "He runs quickly",
      "explanation": "Use 'runs' for present tense and 'quickly' for natural adverb.",
      "offset": 10,
      "length": 10
    }
  ]
}


Example: For “He run fast” (B1):
{
  "errors": [
    {
      "category": "GRAMMAR",
      "message": "Subject-verb agreement error",
      "explanation": "Use a singular verb with a singular subject.",
      "offset": 3,
      "length": 3,
      "suggestions": ["runs"],
      "rule_id": "SUBJECT_VERB_AGREEMENT"
    }
  ],
  "fluency_suggestions": [
    {
      "original": "run fast",
      "suggested": "runs quickly",
      "explanation": "Use 'runs' for present tense and 'quickly' for natural adverb.",
      "offset": 3,
      "length": 8
    }
  ]
}




Acceptance Criteria:
Editor supports basic formatting (bold, italic, lists) via Draft.js toolbar.
Errors are highlighted with red underlines.
OpenAI API is called max once per 500ms via Next.js API route, returning bundled JSON.
Word clicks trigger AWS Polly audio with “Arthur” voice.
Auto-save updates documents table with content, prompt_id, cefr_level, prompt_type, created_at on each debounced change.
Auto-save indicates “Saving…” and “Saved” status in UI.
4.5 Sidebar
F5.1: A sidebar displays OpenAI errors and fluency suggestions in text order.
F5.2: Errors are categorized as Spelling, Grammar, Punctuation, or Style.
F5.3: Each correction/suggestion includes a collapsible plain-English explanation (from OpenAI’s explanation field).
F5.4: Suggestions remain until the user fixes the mistake in the editor.
Acceptance Criteria:
Sidebar lists errors/suggestions with category labels (e.g., “Grammar: Subject-verb agreement”).
Clicking an item expands to show the explanation (e.g., “Use ‘runs’ for singular subjects”).
Suggestions are removed when the editor text updates and OpenAI confirms the fix.
4.6 Document Management
F6.1: Documents auto-save to Supabase with metadata (CEFR level, prompt type, creation date) on each debounced text change.
F6.2: A “My Documents” page lists all saved documents with title (first 50 characters of content), CEFR level, prompt type, and creation date.
F6.3: Users can click a document to view/edit it in the editor.
Acceptance Criteria:
Auto-save updates documents table on each 500ms debounced change.
“My Documents” page displays a table with sortable columns (title, CEFR level, prompt type, date).
Clicking a document loads its content and associated prompt in the editor.
No revision history is stored.
5. Non-Functional Requirements
Performance: Editor feedback updates within 1 second of typing (post-debounce). API calls (OpenAI, AWS Polly) should complete in <500ms under normal conditions.
Security: Supabase Auth secures user data. Documents and prompts are private to the user. API keys (OpenAI, AWS Polly) are stored in environment variables and accessed via Next.js API routes.
Scalability: App is a toy project with minimal users, so no caching or advanced optimization is needed.
Reliability: App handles API failures gracefully (e.g., show “Feedback unavailable” if OpenAI fails).
Usability: UI is clean, with a focus on simplicity for A1–C2 learners. No accessibility features or multilingual UI required.
Privacy: User data (documents, errors) is stored securely in Supabase, with no external sharing. GDPR/CCPA compliance is not prioritized for the toy app.
6. Data Model (Supabase Schema)
This	is the database schema. It has already been created on Supabase.
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')) DEFAULT 'B1',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE prompts (
  id UUID PRIMARY KEY,
  text TEXT NOT NULL,
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  prompt_id UUID REFERENCES prompts(id),
  cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  prompt_type TEXT, -- e.g., 'narrative', 'argumentative'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE errors (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  category TEXT CHECK (category IN ('SPELLING', 'GRAMMAR', 'PUNCTUATION', 'STYLE')),
  message TEXT,
  explanation TEXT,
  offset INTEGER,
  length INTEGER,
  suggestions TEXT[], -- Array of suggested corrections
  rule_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


Technical Architecture
Frontend: React/Next.js with Tailwind CSS for styling, Heroicons for icons (arrow-path for “Refresh”).
Text Editor: Draft.js for editing, with custom formats for error highlighting.
Components: Editor, Sidebar, PromptDisplay, DocumentList, AuthForms.
State Management: React hooks (useState, useEffect) for editor state and API responses.
Backend: Next.js API routes for proxying requests to OpenAI and AWS Polly.
Auth: Supabase Auth for email/password login.
Database: Supabase PostgreSQL for users, prompts, documents, errors
External Services:
OpenAI API: Prompt generation, grammar/spelling/style checks, fluency suggestions (via Next.js API routes).
AWS Polly: Word pronunciation with “Arthur” voice (British English).
Integration Flow:
User types in Draft.js editor; text is debounced (500ms).
Next.js API route sends text to OpenAI, bundling errors/suggestions in a single JSON response.
Errors are highlighted in Draft.js; suggestions populate the sidebar.
Word clicks trigger AWS Polly audio via Next.js API route.
Document auto-saves to Supabase on each debounced change.
Prompt generation uses OpenAI via Next.js API route, stored in Supabase.
9. Feature Checklist
Authentication
Sign-up with email/password
Login with email/password
Logout
Password reset via email
User Profile
Select CEFR level (A1–C2) during sign-up
Update CEFR level in profile
Persist CEFR level in Supabase
Writing Prompts
Display single-sentence CEFR-tailored prompt on editor load
“Refresh” button (with arrow-path Heroicon) generates new prompt via OpenAI
Store prompts in Supabase (prompts table)
Prompts are varied, single-sentence questions/instructions
Text Editor
Draft.js-based editor with basic formatting
Highlight errors (spelling, grammar, punctuation, style) in red
Debounce API calls to 500ms max
OpenAI API for error detection and fluency suggestions
Click word to play pronunciation via AWS Polly (“Arthur”)
Auto-save document to Supabase on debounced change
Show “Saving…”/“Saved” status
Sidebar
Display errors/suggestions in text order
Categorize as Spelling, Grammar, Punctuation, Style
Collapsible plain-English explanations
Remove suggestions when fixed
Document Management
Auto-save documents with CEFR level, prompt type, date
“My Documents” page lists all documents
Click document to view/edit
Analytics
Non-Functional
Feedback updates within 1 second
Secure API keys in environment variables
Handle API failures gracefully
Clean, simple UI with Heroicons
Use OpenAI via Next.js API routes
10. Future Considerations
Use stored prompts to mix with OpenAI-generated ones.
Add LanguageTool for cost-efficient grammar checks.
Implement teacher accounts for reviewing student work.
Support multilingual UI for non-English ESL learners.
Introduce basic analytics dashboard if user base grows.
11. Wireframes (Text-Based)
Login Page:
Email input, password input, “Login” button, “Sign Up” link, “Forgot Password” link.
Sign-Up Page:
Email input, password input, CEFR level dropdown (A1–C2), “Sign Up” button.
Editor Page:
Top: Single-sentence prompt, “Refresh” button with arrow-path Heroicon, CEFR level display.
Center: Draft.js editor with red underlines for errors.
Right: Sidebar with categorized errors/suggestions, collapsible explanations.
Bottom: “Saving…”/“Saved” status indicator.
My Documents Page:
Table with columns: Title (first 50 chars), CEFR Level, Prompt Type, Date.
Click row to load document in editor.
12. Dependencies
Frontend: React, Next.js, Tailwind CSS, Draft.js, use-debounce, @heroicons/react
Backend: Supabase (Auth, PostgreSQL), openai for API calls, aws-sdk for Polly.
Environment Variables: OPENAI_API_KEY, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
13. Success Metrics
Users can complete a writing session (prompt response, error fixes) in <10 minutes.
90% of API calls complete in <500ms.
Documents auto-save successfully on each debounced change.
No critical bugs in auth, editor, or document management.
