Of course. Here is the complete task list for implementing the unified application layout.

## Relevant Files

-   `src/components/layout/AppLayout.tsx` - **New File.** This will contain the main reusable layout component, including the persistent header and the area for rendering page content.
-   `src/app/(app)/layout.tsx` - **New File.** A Next.js route group layout to apply the `AppLayout` to all authenticated pages. The `(app)` folder will need to be created.
-   `src/app/documents/page.tsx` - This file's `<nav>` element will be removed, as its functionality will be handled by the new `AppLayout`. It will be moved to `src/app/(app)/documents/page.tsx`.
-   `src/app/editor/page.tsx` - This file's `<nav>` element will be removed. It will be moved to `src/app/(app)/editor/page.tsx`.
-   `src/app/profile/page.tsx` - This page will be moved into the new route group at `src/app/(app)/profile/page.tsx`.
-   `src/app/page.tsx` - This file will be modified to handle the redirect for authenticated users.

### Notes

-   To implement the shared layout, you will need to create a new route group folder named `(app)` inside `src/app`. Move the existing `documents`, `editor`, and `profile` folders into `src/app/(app)/`.
-   The new `src/app/(app)/layout.tsx` file will define the shared layout for all pages within that group.
-   Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

-   [ ] 1.0 **Create the main unified layout component with a persistent header.**
    -   [ ] 1.1 Create a new file at `src/components/layout/AppLayout.tsx`.
    -   [ ] 1.2 Define a React component named `AppLayout` that accepts `children` as a prop.
    -   [ ] 1.3 In the component, create a `header` element and a `main` element. The `main` element should render the `{children}`.
    -   [ ] 1.4 Apply basic styling to the header to match the PRD (white background, bottom border/shadow).

-   [ ] 2.0 **Implement the header's branding, navigation links, and sign-out functionality.**
    -   [ ] 2.1 Add the "🍐 Shakes Pear" brand name and emoji to the left side of the header.
    -   [ ] 2.2 Add the "Editor", "My Documents", and "Profile" navigation links using the Next.js `<Link>` component, pointing to `/editor`, `/documents`, and `/profile` respectively.
    -   [ ] 2.3 Use the `usePathname` hook from `next/navigation` to determine the current page's path.
    -   [ ] 2.4 Apply a visual style (e.g., `bg-gray-900 text-white`) to the link whose `href` matches the current pathname to indicate the active page.
    -   [ ] 2.5 Add a "Sign Out" button to the far right of the header.
    -   [ ] 2.6 Implement the `onClick` handler for the "Sign Out" button to call `supabase.auth.signOut()`.

-   [ ] 3.0 **Integrate the new layout component into the relevant application pages.**
    -   [ ] 3.1 Create a new folder `(app)` inside `src/app`.
    -   [ ] 3.2 Move the `documents`, `editor`, and `profile` page folders into `src/app/(app)/`.
    -   [ ] 3.3 Create a new layout file at `src/app/(app)/layout.tsx`.
    -   [ ] 3.4 In this new layout file, import `AppLayout` and `ProtectedRoute`.
    -   [ ] 3.5 Wrap the layout's `{children}` prop first with `ProtectedRoute` and then with `AppLayout`, ensuring the layout is only shown to authenticated users.

-   [ ] 4.0 **Refactor existing pages to remove redundant navigation elements.**
    -   [ ] 4.1 In `src/app/(app)/documents/page.tsx`, delete the entire `<nav>` block.
    -   [ ] 4.2 In `src/app/(app)/editor/page.tsx`, delete the entire `<nav>` block.
    -   [ ] 4.3 Verify that `src/app/(app)/profile/page.tsx` does not contain any conflicting navigation elements.

-   [ ] 5.0 **Configure the root route (/) to redirect to the editor page for authenticated users.**
    -   [ ] 5.1 Open `src/app/page.tsx`.
    -   [ ] 5.2 At the top of the `Home` component, check for the current user's session using Supabase.
    -   [ ] 5.3 If a user session exists, use the `redirect` function from `next/navigation` to redirect the user to `/editor`.
    -   [ ] 5.4 Ensure the existing sign-in/sign-up content is rendered only if no user session is found.
