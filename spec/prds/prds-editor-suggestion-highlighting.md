### Product Requirements Document

# prd-accurate-suggestion-highlighting.md

## 1. Introduction/Overview

This document outlines the requirements for a complete architectural fix of the real-time writing analysis feature. Currently, suggestion highlights are positioned incorrectly, displaying cumulative, overlapping errors. This is caused by a critical state management bug on the backend where suggestion data from previous, unrelated API requests is leaking into current ones.

The goal is to re-architect the backend analysis pipeline to be **stateless and request-scoped**. This will be achieved by moving all analysis logic and state into a correct, asynchronous traversal algorithm that is instantiated and torn down for every individual API call, ensuring that all suggestion highlights are accurate and completely isolated from other requests.

## 2. Goals

*   **Fix the Bug:** Eliminate the cumulative, overlapping highlighting error by ensuring request isolation.
*   **Increase Robustness:** Implement a stateless backend analysis logic that is safe for a serverless environment.
*   **Unify Analysis Logic:** Ensure both `nspell` and `retext` analysis are performed within a single, structure-aware, and fully asynchronous traversal function.

## 3. User Stories

*   **As a user typing a sentence,** I want only the errors in my *current* text to be highlighted, so I am not confused by old or irrelevant suggestions.
*   **As a user writing a long essay,** I want the feedback to be fast and accurate, without being affected by previous edits I have made.

## 4. Functional Requirements

### FR1: The Client must send structured JSON to the analysis API.
The editor and context must be configured to send the full ProseMirror JSON document to the `/api/analyze` endpoint.

### FR2: The Backend API must be stateless and request-scoped.
All variables used to store the results of an analysis (specifically the `suggestions` array) **must** be declared within the scope of the `POST` request handler function. No suggestion data should persist at the module level between requests.

### FR3: The Backend must implement a correct, asynchronous traversal algorithm.
*   The API must implement a recursive `traverse` function that is `async` and correctly calculates the "size" of every node it processes (text, leaf, and container nodes).

### FR4: The Backend must unify all analysis within the asynchronous traversal.
*   All analysis logic (`nspell` and `retext`) must be executed *inside* the `async traverse` function's handler for `text` nodes.
*   The call to the asynchronous `retextProcessor.process()` must be explicitly `await`ed.

### FR5: The Backend must calculate absolute positions for all suggestions.
*   When any suggestion is found, its start position must be calculated as: `(position at start of text node) + (local index of word/phrase)`.

## 5. Non-Goals (Out of Scope)
*   Improving suggestion quality, changing highlight appearance, or implementing incremental analysis.
