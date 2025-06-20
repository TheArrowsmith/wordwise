# PRD: Unified Application Layout

## 1. Introduction/Overview

This document outlines the requirements for implementing a consistent, unified layout across the Shakes Pear application. The goal is to provide users with a persistent navigation header on all authenticated pages, improving user experience and reinforcing the application's brand identity. This will replace the current, inconsistent navigation elements with a single, reusable layout component.

## 2. Goals

*   **Improve Navigation:** Provide a clear and consistent way for users to navigate between the main sections of the application (Editor, Documents, Profile).
*   **Enhance User Experience:** Ensure a predictable and professional user interface, regardless of the page the user is on.
*   **Increase Development Efficiency:** Create a single, reusable layout component (Don't Repeat Yourself - DRY) to simplify future updates and maintenance.
*   **Strengthen Brand Identity:** Standardize the application's branding with the new "Shakes Pear" name and logo in the header.

## 3. User Stories

*   **As a registered user, I want to** see the same navigation bar on every page after I log in, **so that I** can easily switch between writing a new document, viewing my saved documents, and changing my settings.
*   **As a registered user, I want to** know which page I am currently on, **so that I** can orient myself within the application.
*   **As a registered user, I want to** be able to log out from any page, **so that I** can securely end my session.

## 4. Functional Requirements

### 4.1. Layout Component

1.  A new, reusable layout component shall be created to provide a consistent page structure.
2.  This layout component must wrap the page content for the following authenticated routes:
    *   `/editor`
    *   `/documents`
    *   `/profile`
3.  The layout component must NOT be applied to unauthenticated routes (`/auth/signin`, `/auth/signup`).
4.  The root route (`/`) must redirect an authenticated user to the `/editor` page to start a new document.

### 4.2. Header Bar

1.  The header bar must be displayed at the top of all pages that use the unified layout.
2.  The header must have a white background and a subtle bottom border/shadow, matching the style seen in `src/app/editor/page.tsx`.

### 4.3. Branding / Logo

1.  The text "WordWise" in the header must be replaced with "Shakes Pear".
2.  A pear emoji (🍐) must be displayed immediately to the left of the "Shakes Pear" text.
3.  The "🍐 Shakes Pear" logo is for branding only and does not need to be a clickable link.

### 4.4. Navigation Links

1.  The header must contain the following navigation links, displayed on the left side of the header:
    *   **Editor:** Links to `/editor`. This will create a new document with a new prompt.
    *   **My Documents:** Links to `/documents`.
    *   **Profile:** Links to `/profile`.
2.  The link corresponding to the currently active page must be visually distinct from the other links (e.g., using a different background color, font weight, or text color). The active state style from the `/documents` page `nav` is a good reference.
3.  A **Sign Out** link must be displayed on the far right side of the header.
4.  Clicking the "Sign Out" link must log the user out and redirect them to the sign-in page. The existing sign-out functionality can be reused.

## 5. Non-Goals (Out of Scope)

*   This feature will not include a mobile-responsive "hamburger" menu. The desktop layout is the priority.
*   The design of the `signin` and `signup` pages will not be changed.
*   No changes will be made to the functionality of the pages themselves, only to the layout that contains them.
*   The "Saved" status indicator that currently exists on the editor page does not need to be part of this new global header.

## 6. Design Considerations

*   **Reference Component:** The navigation bar currently implemented in `src/app/documents/page.tsx` should be used as the primary design and functional reference for the new global header.
*   **Styling:** Use Tailwind CSS for styling to maintain consistency with the rest of the application.
*   **Active Link Style:** The `bg-gray-900` class used for the active link on the documents page is a good choice for indicating the current page.

## 7. Technical Considerations

*   **Implementation:** The new layout should be implemented as a Next.js Layout component (`layout.tsx`) or a client-side wrapper component that can be applied to the relevant pages.
*   **Authentication:** The layout component must be used within the `ProtectedRoute` context to ensure it only appears for authenticated users.
*   **Code Reusability:** The existing `supabase.auth.signOut()` function should be used for the sign-out functionality.

## 8. Success Metrics

*   Successful implementation will be confirmed when all specified pages (`/editor`, `/documents`, `/profile`) display the new, consistent header after a user logs in.
*   All navigation links and the sign-out button function as described.
*   The code is implemented in a single, reusable component.

## 9. Open Questions

*   None at this time.
