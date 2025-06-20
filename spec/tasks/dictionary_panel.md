## Relevant Files

-   `src/app/api/dictionary/route.ts` - New API route handler to process dictionary lookup requests from the frontend.
-   `src/components/editor/DictionaryPanel.tsx` - New frontend component for the dictionary UI, state management, and user interaction.
-   `src/app/editor/page.tsx` - Existing editor page that needs to be modified to include the new `DictionaryPanel` component.
-   `src/types/dictionary.ts` - New file to hold TypeScript types related to the dictionary feature, such as the API response structure.
-   `src/lib/openai.ts` - Potentially a new utility file to centralize the OpenAI client initialization, using the `OPENAI_API_KEY`.

### Notes

-   Unit tests should typically be placed alongside the code files they are testing (e.g., `DictionaryPanel.tsx` and `DictionaryPanel.test.tsx` in the same directory).
-   Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

-   [ ] **1.0 Create Backend API Endpoint for Dictionary Lookups**
    -   [ ] 1.1 Create the file `src/app/api/dictionary/route.ts`.
    -   [ ] 1.2 Implement a `POST` handler function that accepts a JSON body with `{ word: string, nativeLanguage: string }`.
    -   [ ] 1.3 Add basic validation to ensure `word` and `nativeLanguage` are present in the request. Return a 400 error if they are missing.
    -   [ ] 1.4 Define the expected success and error response structures for the API endpoint.

-   [ ] **2.0 Implement OpenAI Logic in the Backend**
    -   [ ] 2.1 Initialize the OpenAI client using the `OPENAI_API_KEY` environment variable. This can be done directly in the route handler or in a separate utility file (`src/lib/openai.ts`).
    -   [ ] 2.2 Construct a system prompt for the `gpt-4o-mini` model instructing it to act as a dictionary and return a JSON object.
    -   [ ] 2.3 Create a user prompt containing the word to define and the native language for translation.
    -   [ ] 2.4 Make an API call to the OpenAI Chat Completions endpoint, ensuring you request JSON mode.
    -   [ ] 2.5 Parse the JSON response from the OpenAI API. Implement error handling for cases where the API call fails or returns an invalid format.
    -   [ ] 2.6 Return the structured JSON data (or an error message) from the API endpoint to the frontend.

-   [x] **3.0 Build the `DictionaryPanel` Frontend Component**
    -   [x] 3.1 Create the file `src/components/editor/DictionaryPanel.tsx`.
    -   [x] 3.2 Add a text input field with the placeholder "Look up a word...".
    -   [x] 3.3 Create the UI for the "Initial State" as defined in the PRD.
    -   [x] 3.4 Implement the "Loading State" UI, which should include a spinner or similar indicator.
    -   [x] 3.5 Implement the "Results State" UI to cleanly display a list of definitions (with parts of speech) and translations.
    -   [x] 3.6 Implement the "Not Found State" UI, which displays the error message specified in the PRD.
    -   [x] 3.7 Apply consistent styling to match the Writing Suggestions panel (w-80 class, border-l border-gray-200).
    -   [x] 3.8 Add "English → [Native Language]" subheading below the Dictionary title.
    -   [x] 3.9 Implement proper header structure with title and language subheading in a bordered section.

-   [x] **4.0 Implement State Management and API Integration in `DictionaryPanel`**
    -   [x] 4.1 Use `useState` hooks to manage the component's state: input value, loading status, API results, and any error messages.
    -   [x] 4.2 Create a function to call the `POST /api/dictionary` endpoint.
    -   [x] 4.3 Use a debounce hook (e.g., from `use-debounce`) or a `useEffect` with a `setTimeout` to trigger the API call 500ms after the user stops typing in the input field.
    -   [x] 4.4 Update the component's state based on the API response (e.g., set loading to false, populate results, or display an error).
    -   [x] 4.5 Ensure the user's `nativeLanguage` (from their profile) is fetched and passed to the API call. You may need to retrieve this from a context or props.
    -   [x] 4.6 Implement proper authentication headers for API calls using Supabase session tokens.

-   [x] **5.0 Integrate `DictionaryPanel` into the Editor Page**
    -   [x] 5.1 Open `src/app/editor/page.tsx`.
    -   [x] 5.2 Import the new `DictionaryPanel` component.
    -   [x] 5.3 Add the `<DictionaryPanel />` component to the page's layout, ensuring it is positioned above the "Writing Suggestions" panel as specified in the PRD.
    -   [x] 5.4 Update the profile state to include `native_language` field from the database.
    -   [x] 5.5 Pass the user's native language as a prop to the DictionaryPanel component.
    -   [x] 5.6 Ensure proper vertical spacing (space-y-6) between the Dictionary and Writing Suggestions panels.

## Completed Additional Tasks

-   [x] **1.0 Create Backend API Endpoint for Dictionary Lookups**
    -   [x] 1.1 Create the file `src/app/api/dictionary/route.ts`.
    -   [x] 1.2 Implement a `POST` handler function that accepts a JSON body with `{ word: string, nativeLanguage: string }`.
    -   [x] 1.3 Add basic validation to ensure `word` and `nativeLanguage` are present in the request. Return a 400 error if they are missing.
    -   [x] 1.4 Define the expected success and error response structures for the API endpoint.

-   [x] **2.0 Implement OpenAI Logic in the Backend**
    -   [x] 2.1 Initialize the OpenAI client using the `OPENAI_API_KEY` environment variable in `src/lib/openai.ts`.
    -   [x] 2.2 Construct a system prompt for the `gpt-4o-mini` model instructing it to act as a dictionary and return a JSON object.
    -   [x] 2.3 Create a user prompt containing the word to define and the native language for translation.
    -   [x] 2.4 Make an API call to the OpenAI Chat Completions endpoint, ensuring you request JSON mode.
    -   [x] 2.5 Parse the JSON response from the OpenAI API. Implement error handling for cases where the API call fails or returns an invalid format.
    -   [x] 2.6 Return the structured JSON data (or an error message) from the API endpoint to the frontend.
