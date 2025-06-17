# Onboarding

`/onboarding`.

- [x] Authenticated users only.
- [x] If the user already has a `profiles` entry, don't allow access to this page. Redirect to `/`.
- [x] Show a form to choose your self-rated CEFR level.
- [x] Ask 'How good is your English?'
- [x] Show the 6 CEFR levels from A1 to C2, each with the description in `spec/cefr_descriptions.txt`.
    - [x] The 'A1' option is highlighted by default.
    - [x] This can use the same shared component as the CEFR selector on the profile page (spec/requirements/profile.md)
- [x] Clicking a level selects (i.e. highlights) that level.
- [x] Clicking 'submit':
    - [x] updates the `cefr_level` of the current user's `profile` in Supabase.
    - [x] redirects to `/editor`
