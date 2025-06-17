# Onboarding

`/onboarding`.

- [ ] Authenticated users only.
- [ ] If the user already has a `profiles` entry, don't allow access to this page. Redirect to `/`.
- [ ] Show a form to choose your self-rated CEFR level.
- [ ] Ask 'How good is your English?'
- [ ] Show the 6 CEFR levels from A1 to C2, each with the description in `spec/cefr_descriptions.txt`.
    - [ ] The 'A1' option is highlighted by default.
    - [ ] This can use the same shared component as the CEFR selector on the profile page (spec/requirements/profile.md)
- [ ] Clicking a level selects (i.e. highlights) that level.
- [ ] Clicking 'submit':
    - [ ] updates the `cefr_level` of the current user's `profile` in Supabase.
    - [ ] redirects to `/editor`
