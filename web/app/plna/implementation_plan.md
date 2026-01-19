# Implementation Plan: Interview Task Status Checker (Restored)

This document outlines the architecture and implementation details of the recreated Interview Task Status Checker application.

## 1. System Architecture

*   **Framework**: Next.js 14+ (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS (with `lucide-react` for icons)
*   **Database**: MongoDB (connecting to `interviewSupport` database)
*   **State Management**: React internal state (`useState`, `useEffect`)
*   **Animations**: `framer-motion`

## 2. Component Implementation Details

### A. Core Page & Navigation (`app/page.tsx`)
*   **Functionality**: Acts as the main controller.
*   **Features**:
    *   **Tab System**: Switch between Reports, Monitor, and Mismatches.
    *   **Security Layer**: Enforces password protection (`Hkpatel@21`) for "Monitor" and "Mismatches" tabs. "Reports" is public.
    *   **Dynamic Rendering**: Conditionally renders feed components based on active tab and authentication state.

### B. Reports Tab (`components/ReportsFeed.tsx`)
*   **Goal**: Visualize high-level statistics for interview tasks.
*   **Data Source**: `GET /api/reports`
*   **Visualization**:
    *   **Branch Aggregation**: Groups tasks into `GGR`, `LKO`, `AHM` (based on sender/cc analysis) and `Other`.
    *   **Metrics**: Total tasks per branch.
    *   **Breakdowns**: Counts by Status (Pending, Completed, etc.) and Round breakdown (top 5).
*   **UI**: Grid of cards, one per branch, using `framer-motion` for entry animations.

### C. Monitor Tab (`components/MonitorFeed.tsx`)
*   **Goal**: General task management and status updates (The "Checklist").
*   **Data Source**: `GET /api/validations` (fetches all tasks sorted by date).
*   **Key Features**:
    *   **Infinite Scroll**: Uses `react-intersection-observer` to load tasks in chunks (client-side pagination).
    *   **Status Editing**: Interactive `StatusBadge` allows changing status (drives `PATCH /api/validations`).
    *   **Search**: Client-side filtering by candidate name or subject.
    *   **Bulk Actions**: Select multiple tasks -> Floating Action Bar appears -> Bulk update status.

### D. Mismatches Tab (`components/MismatchFeed.tsx`)
*   **Goal**: Detect and resolve discrepancies between the `Interview Round` stored in DB and the round extracted from email content.
*   **Data Source**: `GET /api/mismatches` (Streaming NDJSON response for performance).
*   **Logic**:
    *   **Extraction**: API uses Regex (`/(1st|2nd|...)\s*round/i`) to find rounds in `subject` or `replies`.
    *   **Comparison**: Compares `actualRound` (DB) vs Extracted.
*   **Features**:
    *   **Resolution UI**: Shows "Extracted" vs "Current" side-by-side.
    *   **Fix**: Dropdown to set `actualRound` to specific standard value.
    *   **Remove**: "Trash" icon to unset `actualRound` (force re-calculation).
        *   **Custom Modal**: Custom built confirm dialog (Framer overlay) instead of browser alert.
    *   **Evidence**: Clicking a card opens `ReplyModal` showing email history.

### E. Shared Components
*   **`StatusBadge`**: Color-coded badge (`Pending`=Yellow, `Completed`=Green, etc.). Supports `onChange` for editing.
*   **`ReplyModal`**: Slides over to show full email thread details for context verification.

## 3. API & Data Layer

### Database Schema (`models/Task.ts`)
*   **Collection**: `taskBody`
*   **Key Fields**:
    *   `status`: Current workflow status.
    *   `actualRound`: The validated round (manually set).
    *   `replies`: Array of email bodies/snippets.
    *   `candidateName`, `subject`, `date`: Metadata.

### Endpoints
1.  **`/api/reports`**:
    *   `GET`: Aggregates stats. Contains logic to classify Branch based on `sender` string (e.g., "gurugram" -> GGR).
2.  **`/api/validations`**:
    *   `GET`: Returns list of tasks.
    *   `PATCH`: Updates `status`. Supports `{ id, status }` (single) or `{ ids: [], status }` (bulk).
3.  **`/api/mismatches`**:
    *   `GET`: Streams NDJSON. Iterates all tasks, runs regex extraction, yields only tasks where `extracted != current` (or invalid).
    *   `PATCH`: 
        *   Update: `{ id, actualRound: "..." }`
        *   Remove: `{ id, actualRound: null }` (Uses MongoDB `$unset`).

## 4. Next Steps / Roadmap
*   **Refinement**: Improve regex accuracy for "Loop Round" vs "Final Round".
*   **Auth**: Move from hardcoded string to real auth (NextAuth) if scaling.
*   **Performance**: Add server-side pagination for `/api/validations` (currently client-side slice).
