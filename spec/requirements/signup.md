# Sign-Up Screen

- [ ] Display email input field 
- [ ] Display password input field (type="password", toggle visibility icon)
- [ ] Display “Sign Up” button
- [ ] Call Supabase Auth `signUp` and insert user into `users` table
- [ ] Show error message for invalid email or weak password
- [ ] Redirect to the CEFR onboarding selector on successful sign-up.
- [ ] Display “Already have an account? Login” link
- [ ] Center content
- [ ] Responsive: Stacked inputs on mobile.

After successful signup:

- [ ] Show a form to choose your self-rated CEFR level.
- [ ] Ask 'How good is your English?'
- [ ] Show the 6 CEFR levels from A1 to C2, each with the description in `spec/cefr_descriptions.txt`.
- [ ] The 'A1' option is highlighted by default.
- [ ] Clicking a level selects (i.e. highlights) that level.
- [ ] Clicking 'submit':
    - [ ] updates the `cefr_level` of the current user's `profile` in Supabase.
    - [ ] redirects to `/editor`
