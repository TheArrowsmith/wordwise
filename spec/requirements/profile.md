### Profile Screen

`/profile`

- [x] Display email (read-only).
- [x] Display CEFR level selector: 
    - [x] Show the 6 CEFR levels from A1 to C2, each with the description in `spec/cefr_descriptions.txt`.
    - [x] The user's current CEFR level (based on `profiles.cefr_level` for this user) is highlighted by default.
    - [x] This can use the same shared component as the CEFR selector on onboarding (spec/requirements/signup.md)
- [x] Display "Save" button
- [x] Update `profiles` table on save.
- [x] Show success message or error.
- [x] Center content
- [x] Responsive: Stacked inputs on mobile.
