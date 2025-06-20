# tasks-prd-native-language-selection.md

## Relevant Files

-   `src/types.ts` - Contains the `Profile` interface which needs to be updated.
-   `src/components/NativeLanguageSelector.tsx` - A new, reusable component for selecting a language.
-   `src/app/onboarding/page.tsx` - The user onboarding page where the new selector will be added.
-   `src/app/profile/page.tsx` - The user profile page where the selector will be added for editing.

### Notes

-   You have direct access to the Supabase database. The first task provides the exact SQL command to run.
-   This task list focuses on implementation. End-to-end testing should be performed manually after completion.

## Tasks

-   [ ] 1.0 **Update Database and Application Types**
    -   [ ] 1.1 In your Supabase dashboard's SQL Editor, run the following command to add the `native_language` column to the `profiles` table:
        ```sql
        ALTER TABLE profiles
        ADD COLUMN native_language TEXT;
        ```
    -   [ ] 1.2 Open `src/types.ts` and update the `Profile` interface to include the new `native_language` field. It should be nullable to support existing users.
        ```typescript
        // src/types.ts

        export interface Profile {
          id: string;
          cefr_level: CEFRLevel;
          native_language: string | null; // Add this line
          created_at: string;
          updated_at: string;
        }
        ```

-   [ ] 2.0 **Create a Reusable Native Language Selector Component**
    -   [ ] 2.1 Create a new file at `src/components/NativeLanguageSelector.tsx`.
    -   [ ] 2.2 Define the component's props interface. It should accept `value` (the currently selected language code), `onChange` (a function to call when the selection changes), and an optional `className`.
        ```typescript
        interface NativeLanguageSelectorProps {
          value: string;
          onChange: (value: string) => void;
          className?: string;
        }
        ```
    -   [ ] 2.3 Implement the component to render a `<select>` dropdown element.
    -   [ ] 2.4 Add a default, disabled, and hidden `<option>` with the text "Select your language..." and an empty value (`""`).
    -   [ ] 2.5 Populate the dropdown with `<option>` elements for Spanish (`es`), German (`de`), French (`fr`), and Portuguese (`pt`), ensuring the `value` attribute for each is the correct two-letter code.
    -   [ ] 2.6 Style the dropdown to match the existing form inputs in the application (e.g., the inputs in `src/app/auth/signin/page.tsx`).

-   [ ] 3.0 **Integrate Language Selector into the Onboarding Page**
    -   [ ] 3.1 Open `src/app/onboarding/page.tsx`.
    -   [ ] 3.2 Import the new `NativeLanguageSelector` component.
    -   [ ] 3.3 Add a new state to manage the selected native language: `const [nativeLanguage, setNativeLanguage] = useState('');`
    -   [ ] 3.4 Render the `NativeLanguageSelector` component within the form, likely below the `CEFRSelector`. Bind its `value` to `nativeLanguage` and its `onChange` to `setNativeLanguage`.
    -   [ ] 3.5 Update the `handleSubmit` function to pass the `nativeLanguage` state value to the `native_language` field in the `supabase.from('profiles').insert()` call.
    -   [ ] 3.6 Modify the `disabled` attribute on the "Get Started" button to ensure it remains disabled until both a CEFR level is chosen AND a native language is selected (i.e., `nativeLanguage !== ''`).

-   [ ] 4.0 **Integrate Language Selector into the Profile Page**
    -   [ ] 4.1 Open `src/app/profile/page.tsx`.
    -   [ ] 4.2 Import the `NativeLanguageSelector` component.
    -   [ ] 4.3 Add a new state to manage the selected native language: `const [nativeLanguage, setNativeLanguage] = useState('');`
    -   [ ] 4.4 In the `loadProfile` function, update the `select` query to include `native_language`. Set the `nativeLanguage` state with the fetched value, defaulting to an empty string if it's `null`.
        ```typescript
        // In loadProfile, after fetching profile data
        setNativeLanguage(profile.native_language || '');
        ```
    -   [ ] 4.5 Render the `NativeLanguageSelector` component within the form. Bind its `value` to `nativeLanguage` and its `onChange` to `setNativeLanguage`.
    -   [ ] 4.6 In the `handleSave` function, update the `upsert` call to include the `native_language: nativeLanguage` key-value pair.
