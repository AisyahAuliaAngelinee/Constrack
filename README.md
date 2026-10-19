# Constrack

Kanban workspace with Next.js App Router, TypeScript, Redux Toolkit, Supabase Auth/Postgres/Realtime, and server-side Gemini integration.

## Start

Follow **[INTEGRATION.md](INTEGRATION.md)** to run the SQL migration and configure `.env.local` first.

```bash
npm install
npm run dev
```

Open http://localhost:3000/login/. Accounts start with an empty workspace. The app requires a running Next.js server; static export is no longer used.

## Integrated flows

- Email/password registration, sign-in, password reset, and logout; Google OAuth when configured in Supabase.
- Persistent boards/tasks, subtasks, assignees, priorities, labels, dates, Kanban, calendar, and My Tasks.
- Shared workspaces, owner-created single-use invitation links, membership-based row-level access.
- Realtime refresh with polling fallback, visible save failures, and conflict detection.
- Gemini task generation, task breakdown, and board progress summaries, with review before apply and server-side rate limits.
- Workspace settings, command search, responsive sidebar, navigation loading bar, and Prettier format-on-save settings.

## Checks

```bash
npm test
npm run typecheck
npm run build
npm start
```

See the setup guide for live service tests and remaining beta limitations. Supabase credentials and Gemini key/model are required to activate the integrations. No live-service success is implied by a passing local build.

## Product documents

- [Blueprint](Constrack-01-Blueprint.md)
- [Application specification](Constrack-02-Spesifikasi-Aplikasi.md)

These describe the broader product roadmap; the setup guide describes the current implementation.

## License

[MIT](LICENSE).
