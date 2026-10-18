# Constrack

Frontend demo of the Constrack AI Kanban workspace. Built with Next.js App Router, strict TypeScript, Redux Toolkit, React Redux, Framer Motion and Lucide icons.

## Run locally

Requires Node.js 20.9+ and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000/app/dashboard for the workspace, or http://localhost:3000 for the homepage.

```sh
npm run typecheck
npm run build
```

The current configuration creates a static export in `out/`.

## Working in this version

- Homepage and explicit demo entry screen.
- Floating, collapsible sidebar and mobile navigation drawer.
- Dashboard metrics, stacked status chart, board composition and recent boards.
- Board creation, board search, ownership filter and sorting.
- Task creation/editing, priority, label, due date, assignee and subtasks.
- Drag tasks between columns; status dropdown offers an accessible alternative.
- My Tasks with search, priority/board filters, sorting and list/card views.
- Calendar month navigation, due-date task links and unscheduled tasks.
- Command menu via Cmd+K / Ctrl+K, with board/task/page search.
- Editable local profile and sample team directory.
- Redux state persisted in browser localStorage under `constrack-v1`.

## Explicit limitations

This is a local-data frontend demo, not the full production specification. Sample members and tasks are labeled as demo data. No requests are sent to Gemini, Google Auth or Supabase. AI and sign-in screens state that their services are not connected.

Not implemented yet: authentication/registration, membership enforcement, realtime synchronization, notifications delivery, invitation emails, sprint lifecycle, Gemini generation/apply, within-column task reordering, server validation and RTK Query integration. Board routes currently use `/app/boards?id=...` to support locally created boards in a static export. Production dynamic routes should become `/app/boards/[boardId]` when a backend is connected.

The current visual components use custom CSS and Lucide. Tailwind, shadcn/ui, Animate UI and Hugeicons integration remains for the next implementation pass; this version does not claim to include them.

## Backend integration path

1. Add Supabase authentication and database migrations based on the specification.
2. Implement RLS, workspace and board membership, and API validation before shared access.
3. Replace localStorage persistence with RTK Query endpoints and realtime invalidation.
4. Switch from static export to a server deployment before adding Gemini API routes.
5. Store GEMINI_API_KEY on the server; never expose it in browser code.
6. Add sprint snapshots, review/apply, conflict handling and idempotency.

## Documentation

- [Product blueprint](Constrack-01-Blueprint.md)
- [Application specification](Constrack-02-Spesifikasi-Aplikasi.md)

## Verification

TypeScript and production static export pass. The dashboard has been opened and visually checked in ChatGPT Browser through localhost. Full interaction and backend testing remains pending.

Navigation includes a thin green progress bar at the top of the viewport.

## License

[MIT](LICENSE).
