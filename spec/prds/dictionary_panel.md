# PRD: In-Editor Dictionary Panel

- **Feature:** Dictionary Panel

## 1. Introduction & Overview

This document outlines the requirements for a new **Dictionary Panel** within the main editor. This feature is designed to help English language learners quickly look up definitions and native-language translations of English words without leaving the application. By providing an integrated dictionary, we can create a more seamless and efficient writing experience, helping users expand their vocabulary and use new words with confidence.

The core goal is to provide a fast, simple, and context-aware dictionary that leverages the user's existing profile information.

## 2. Goals

- **Provide Instant Word-Lookup:** Allow users to get definitions and translations for any English word directly in the editor.
- **Improve User Efficiency:** Eliminate the need for users to switch to an external dictionary or translation tool, keeping them focused on their writing.
- **Leverage User Data:** Use the native language specified in the user's profile to provide personalized translations.
- **Deliver Clear Feedback:** Inform the user when a word cannot be found or when a search is in progress.

## 3. User Stories

- **As an English learner writing an essay,** I want to type an English word into a dictionary panel to see its definition, part of speech, and translation in my native language, so I can quickly understand and use the word without leaving the editor.
- **As a user,** when I type a word that doesn't exist or is misspelled, I want to see a clear "not found" message so I can correct the spelling and try again.
- **As a user,** if a word has multiple meanings (e.g., "lead"), I want to see all its definitions and their corresponding parts of speech so I can choose the correct one for my context.

## 4. Functional Requirements

### FR-1: Dictionary Panel UI
1. A new UI panel titled "Dictionary" shall be added to the editor screen, positioned directly above the existing "Writing Suggestions" panel.
2. The panel must have the same width as the "Writing Suggestions" panel to ensure visual alignment.
3. The panel must have consistent vertical spacing (space-y-6) between itself and the "Writing Suggestions" panel, matching the spacing used between other UI elements in the editor.
4. The panel must display a subheading showing "English → [Native Language]" below the main "Dictionary" title.
5. The panel must contain a text input field for the user to type in an English word. The placeholder text for this field should be "Look up a word...".

### FR-2: Search Functionality
1. The search shall be triggered automatically as the user types into the input field.
2. API requests to the backend must be debounced by **500ms** to prevent excessive calls while the user is typing.
3. A backend API endpoint shall be created to handle the dictionary query. This endpoint will accept the English word and the user's native language.

### FR-3: Backend & LLM Integration
1. The backend shall use the GPT-4.1 nano model to fetch word information.
2. The user's native language must be retrieved from their profile and passed to the backend with each request. It can be assumed that this value is always set.
3. The LLM prompt must request the following information for the given English word:
    - All distinct English definitions.
    - The part of speech for each definition (e.g., Noun, Verb, Adjective).
    - The translation(s) in the user's native language.
    - A boolean flag indicating if the word was found.

### FR-4: Displaying Results
1. The panel must display a loading indicator (e.g., a spinner) while waiting for the backend response.
2. If the word is found, the panel shall display:
    - A list of all definitions. Each definition must be accompanied by its part of speech.
    - A list of all translations in the user's native language.
3. If the word is not found, the panel must display a user-friendly error message, such as: `"[word]" not found. Please check the spelling.`

## 5. Non-Goals (Out of Scope)

The following features will not be included in this version to manage scope:
- A history of previously searched words.
- Example sentences for each definition.
- Audio pronunciation of the word.

## 6. Design & UI/UX Considerations

### Visual Alignment
- The Dictionary Panel must match the exact width and styling of the Writing Suggestions panel (w-80 class)
- Both panels should use consistent border styling (border-l border-gray-200)
- Proper vertical spacing (space-y-6) must be maintained between panels
- The panel header should include both the "Dictionary" title and "English → [Native Language]" subheading

### Panel States
The Dictionary Panel should have four distinct states:
- **Initial State:** An empty input field with the placeholder "Look up a word..." and helper text "Enter a word to see its definition and translation"
- **Loading State:** The input field remains, but a loading spinner with "Looking up word..." text appears within the panel body
- **Results State:** A clean, scrollable list of definitions and translations. A sample layout for a result could be:
  > **book**
  >
  > *noun* - a written or printed work consisting of pages glued or sewn together along one side and bound in covers.
  >
  > *verb* - reserve (accommodations, a ticket, etc.) for a future time.
  >
  > **Translation (Spanish):** libro, reservar
- **Not Found State:** A user-friendly error message: `"[word]" not found. Please check the spelling.`

## 7. Technical Considerations

- **Frontend:**
  - A new React component, `DictionaryPanel.tsx`, should be created.
  - This component will manage its own state (input value, loading, results, error).
  - It will use a debounce hook (e.g., from `use-debounce`) on the input field's `onChange` handler.
- **Backend:**
  - Create a new API route, e.g., `POST /api/dictionary`.
  - The endpoint should expect a JSON body: `{ "word": "string", "nativeLanguage": "string" }`.
  - **Crucially**, the prompt to the LLM should ask for a structured **JSON response** to ensure reliable parsing. Example structure for the LLM's return data:
    ```json
    {
      "wordFound": true,
      "definitions": [
        { "partOfSpeech": "Noun", "definition": "A set of written or printed pages, usually bound with a protective cover." },
        { "partOfSpeech": "Verb", "definition": "To reserve a place, ticket, or service in advance." }
      ],
      "translations": ["libro", "reservar"]
    }
    ```

## 8. Success Metrics

- Success metrics are not required for this version.

## 9. Open Questions

- None at this time. All initial questions have been resolved.
