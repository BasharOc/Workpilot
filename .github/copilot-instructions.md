# Copilot Instructions – Workpilot

Workpilot is a full-stack freelancer management app (clients, projects, tasks, time tracking, invoices). It is a monorepo with independent `client/` (React + Vite) and `server/` (Express + Prisma) packages coordinated via Docker Compose.

---

## Commands

### Client (`client/`)
```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build
npm run lint       # ESLint (flat config)
npm run preview    # Preview production build
```

### Server (`server/`)
```bash
npm run dev        # nodemon with tsx (no compile step)
npm run build      # tsc
npm run start      # node dist/index.js
npm run typecheck  # tsc --noEmit

npm run db:migrate  # prisma migrate dev
npm run db:push     # prisma db push (no migration file)
npm run db:studio   # Prisma Studio GUI
npm run db:generate # Regenerate Prisma client after schema changes
```

> No test suite is configured. `npm run lint` (client) and `npm run typecheck` (server) are the primary validation tools.

---

## Architecture

### Request Flow
Browser → Nginx (prod) → `/api/*` proxied to Express server → Prisma → PostgreSQL

In dev, Vite's dev server proxies `/api` to `http://localhost:3000` (configured in `vite.config.ts`).

### Auth
- JWT access token (15m) stored in memory via Zustand; sent as `Authorization: Bearer` header
- Refresh token (7d) in an HTTP-only cookie
- On 401, the Axios response interceptor auto-retries after calling `/api/auth/refresh`
- Google OAuth supported via redirect flow → `GoogleAuthCallbackPage.tsx`
- Auth state lives in `client/src/store/auth.store.ts` (Zustand); initialized on app mount via `checkAuth()`

### Data Model (Prisma)
`User → Client → Project → Task → TimeEntry`
`User → Invoice → Client`

Key fields: `Task.position` (float, for Kanban order), `Task.status` (todo | in_progress | in_review | done), `TimeEntry.durationSeconds`.

### Server Structure
Controllers handle request/response; business logic that needs to be shared lives in `services/`. Currently only `auth.service.ts` exists — most logic is inline in controllers.

```
routes/*.routes.ts → controllers/*.controller.ts → prisma.ts
                                                  → services/*.service.ts (auth only)
```

All routes require `requireAuth` middleware (checks Bearer token) except the public auth endpoints.

### Frontend Structure
- **Pages** (`src/pages/`) — one file per route, fetches its own data
- **Components** (`src/components/`) — grouped by domain (`tasks/`, `auth/`, `invoices/`)
- **Hooks** (`src/hooks/`) — `useInlineEdit`, `usePortalMenu`, `useGlobalShortcuts`, `useLocalStorage`, `useTheme`
- **API** (`src/api/axios.ts`) — single configured Axios instance with auth interceptors
- **Types** (`src/types/`) — shared TypeScript interfaces mirroring server models

---

## Key Conventions

### File Naming
| Layer | Pattern | Example |
|---|---|---|
| Pages | `PascalCase + Page` | `ClientDetailPage.tsx` |
| Components | `PascalCase` | `TaskCard.tsx` |
| Hooks | `use + PascalCase` | `useInlineEdit.ts` |
| Stores | `camelCase + .store` | `auth.store.ts` |
| Controllers | `camelCase + .controller` | `tasks.controller.ts` |
| Routes | `camelCase + .routes` | `projects.routes.ts` |
| Services | `camelCase + .service` | `auth.service.ts` |

### Styling
- Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js` — configured in `index.css`)
- CSS custom properties define the theme (`--color-primary`, `--color-foreground`, etc.) using `oklch()` color space
- Use `cn()` from `client/src/utils/cn.ts` (wraps `tailwind-merge`) for conditional class merging

### TypeScript
- Both packages use strict mode with `noUnusedLocals` and `noUnusedParameters`
- Path alias `@/*` → `./src/*` in both client and server
- Server uses `NodeNext` module resolution (ES modules); use `.js` extensions in server imports
- Run `npm run db:generate` after any Prisma schema change

### API Routes
REST pattern with nested resources:
```
/api/clients/:id/projects
/api/projects/:projectId/tasks
/api/projects/:projectId/time-entries
```
Tasks are mutated via `/api/tasks/:id`; task creation goes through `/api/projects/:projectId/tasks`.

### Environment Variables
- Copy `.env.example` → `.env` in `server/`
- Required: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`, `RESEND_API_KEY`
- Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (disables Google OAuth if absent)
- Client has no `.env`; uses same-origin `/api` in prod and Vite proxy in dev

### Docker
- Dev: `docker-compose.yml` starts only PostgreSQL (port 5432)
- Prod: `docker-compose.prod.yml` starts `db` + `server` + `client` (Nginx on port 3001)
- VPS reverse proxy config: `nginx.vps.conf` (SSL termination, proxies to port 3001)
