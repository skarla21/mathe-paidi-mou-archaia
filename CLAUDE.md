# mathe-paidi-mou-arxaia — CLAUDE.md

Greek educational platform (Ancient Greek exam prep). Nuxt 4 + Vue 3 + TypeScript.
Deploy target: Vercel. Source dir: `app/` (NOT `src/`).

---

## Skills + Agents — Always Use Both

**On every prompt**, before taking action:

1. **Check for relevant skills/plugins first** — if a skill applies (e.g. `frontend-design` for UI work, `brainstorming` for new features, `test-driven-development` for implementations), invoke it via the `Skill` tool. For this project, ignore skills/plugins from third-party marketplaces.
2. **Then dispatch the appropriate agent** (e.g. `frontend-developer`, `codebase-navigator`) — pass any guidance from the skill into the agent's prompt.

Skills provide **design principles, workflows, and quality standards**. Agents provide **hands-on execution with project-specific tools**. They complement each other — never skip one in favor of the other.

**Examples:**

- Frontend task → invoke `frontend-design` skill → then dispatch `frontend-developer` agent with the design guidance
- New feature → invoke `brainstorming` skill → then plan/implement using the relevant agent
- Bug fix → invoke `systematic-debugging` skill → then use `codebase-navigator` agent to trace the issue
- Documentation lookup → dispatch `docs-explorer` agent directly (no skill needed)

**Rule: If both a skill and an agent are relevant, use both. Skills inform the approach; agents do the work.**

---

## Tech Stack

| Layer         | Choice                                                     |
| ------------- | ---------------------------------------------------------- |
| Framework     | Nuxt 4.3.1, Vue 3, `<script setup lang="ts">`              |
| Styling       | Tailwind CSS v4 (Vite plugin, NO tailwind.config.js)       |
| UI components | shadcn-vue (Radix Vue) — all in `app/components/ui/`       |
| Animations    | GSAP 3 + ScrollTrigger via `useGsapReveal()` composable    |
| Auth          | `@auth/core` JWT sessions — Credentials + Google           |
| Database      | Supabase (PostgreSQL) with RLS                             |
| Storage       | Supabase Storage (PDF uploads)                             |
| Payments      | Stripe (checkout + webhook)                                |
| PDF rendering | pdfjs-dist (dynamic import, client-only)                   |
| Icons         | oh-vue-icons, Bootstrap icon set — `<VIcon name="bi-*" />` |
| Toasts        | vue-sonner — `toast.*()`                                   |
| Email         | Resend (contact form, verification, password reset)        |
| Language      | Greek only. No locale files, no language toggle            |
| Theme         | Custom `useTheme()` composable — class on `<html>`         |

---

## Directory Tree

```
app/
  pages/         # index, about, login, register,
                 # dashboard, [grade], [grade]/[subject], category/[categoryId],
                 # articles, notes, admin/*
  components/
    layout/      # AppHeader.vue, AppFooter.vue, NotesDropdown.vue
    search/      # GlobalSearch.vue
    lesson/      # PdfViewer.vue
    ui/          # shadcn components (Button, Card, Input, …)
  composables/   # useCurrentUser, useTheme, useGsapReveal
  layouts/       # default.vue, admin.vue
  middleware/    # auth.ts, admin.ts, guest-only.ts
  plugins/       # oh-vue-icons.ts
  lib/           # utils.ts (cn = clsx + tailwind-merge)
  assets/css/    # main.css (Tailwind @theme vars + custom utilities)
server/
  api/           # auth/, lessons/, grades.get, subjects.get, tree.get,
                 # search.get, signout.post, stripe/, admin/, user/
  middleware/    # auth.context.ts  ← sets event.context.auth every request
  utils/         # supabaseServer, authOptions, requireAuth, requireAdmin, access
supabase/        # schema.sql
types/           # auth.d.ts (Session augment: id + isAdmin), nitro.d.ts (H3EventContext)
```

---

## Dev Commands

```bash
pnpm dev           # start dev server at http://localhost:3000
pnpm build         # production build
pnpm preview       # preview production build
pnpm check         # typecheck + eslint fix (run after every new feature)
```

Env vars: copy `.env.example`. Prefix `NUXT_PUBLIC_` for client-exposed, `NUXT_` for server-only.

---

## CRITICAL — Git / Remote Rules

- **NEVER push to the remote repository** — commits are local-only. Do NOT run `git push`, `git push --force`, or any command that publishes to a remote.
- **After every new feature**, run `pnpm check` (typecheck + ESLint fix) before committing.

---

## Critical Rules — DO / DON'T

### Language

- **DO** write every user-visible string in Greek, directly in the template, script, or server route
- **DON'T** add locale files, a language toggle, or an i18n library
- **Article likes are επισημάνσεις, not ratings and not προτιμήσεις.** Lessons have star ratings (`lesson_ratings`): βαθμολογία / αξιολόγηση. Articles have likes (`article_likes`): επισήμανση (plural επισημάνσεις). Never label an article like as προτίμηση, βαθμολογία, or αξιολόγηση. «Προτιμήσεις» is only for settings such as notification preferences. The public like button is «Επισήμανση» / «Αναίρεση επισήμανσης».

### Notifications

- **DO** `import { toast } from 'vue-sonner'` → `toast.success('...')`, `toast.error('...')` with Greek text
- **DON'T** use `alert()`, `confirm()`, or `window.prompt()` — ever

### Tailwind / CSS

- **DO** configure theme tokens in `app/assets/css/main.css` under `@theme inline { … }`
- **DON'T** create or modify `tailwind.config.js` — Tailwind v4 uses CSS-only config
- **DO** use semantic tokens: `text-foreground`, `bg-card`, `text-primary`, `text-muted-foreground`
- **DO** write canonical Tailwind v4 classes. Drop brackets on a bare attribute name (`data-highlighted:`, `data-disabled:`). Keep them when the attribute has a value (`data-[state=open]:`, `data-[slot=select-value]:`). Boolean aria uses the bare variant (`aria-checked:`). Important is a suffix (`flex!`). Theme vars use parentheses (`max-h-(--token)`). Prefer v4 names (`bg-linear-to-r`, `shrink-0`, `grow`).

### Components

- **DO** use existing `app/components/ui/` components (Button, Card, Input, …)
- **DON'T** install new UI libraries — extend shadcn components in `ui/` instead
- **DO** register new icons in `app/plugins/oh-vue-icons.ts`, use `<VIcon name="bi-*" />`

### Client/Server Guards

- **DO** use `import.meta.client` for client-only code
- **DON'T** use `process.client` — deprecated preference in this codebase
- **DO** guard GSAP, localStorage, and DOM access with `import.meta.client`

### Auth — Client

- **DO** `const { session, isAdmin, isStudent } = useCurrentUser()` in components
- **DO** `definePageMeta({ middleware: 'auth' })` for protected pages
- **DO** `definePageMeta({ middleware: 'admin' })` for admin pages

### Auth — Server

- **DO** call `requireAuth(event)` to get `userId` (throws 401 if unauthenticated)
- **DO** call `requireAdmin(event)` at the TOP of every `/api/admin/*` handler (throws 403)
- **DO** read user from `event.context.auth.userId` (set by `server/middleware/auth.context.ts`)
- **DON'T** read cookies or re-validate sessions manually in route handlers
- There is one owner admin. Do not build multi-admin features (shared inboxes, admin invites, or per-admin permission splits). Per-admin notification read state still works for that single owner.

### Database

- **DO** use `serverSupabaseService()` for admin/server ops that need to bypass RLS
- **DO** use `serverSupabaseAnon()` for public/user-scoped reads (RLS enforced)
- **DO** use `canAccessLesson(userId, lessonId)` from `server/utils/access.ts`
- **DON'T** expose `supabaseServiceKey` in any `public:` runtimeConfig key

---

## Auth Patterns

### Client-side session

```ts
const { session, isAdmin } = useCurrentUser();
// session.value.user?.id  — string UUID
// session.value.user?.isAdmin  — boolean
```

### Server route — require login

```ts
import { requireAuth } from "~/server/utils/requireAuth";
const userId = requireAuth(event); // throws 401 if missing
```

### Server route — require admin

```ts
import { requireAdmin } from "~/server/utils/requireAdmin";
requireAdmin(event); // throws 403 if not admin
```

### Server context (set by middleware)

```ts
event.context.auth; // { userId: string | null, isAdmin: boolean }
```

---

## Database Patterns

Tables: `users`, `grades`, `subjects`, `courses`, `lessons`, `purchases`

- `users."isAdmin"` — quoted camelCase column
- `courses.is_free`, `lessons.is_free` — gate paid content
- `purchases(user_id, course_id)` — owns a course after Stripe checkout

```ts
const supabase = serverSupabaseService(); // admin/server — bypasses RLS
const supabase = serverSupabaseAnon(); // public reads — respects RLS
```

### Auth tokens

Routes never insert token rows. They delete only the row they just created when the email send fails (`forgot-password`, `resend-verification`, and `register`). Call the service-role functions in `supabase/schema.sql`:

- `register_credentials_user` / `issue_verification_token` / `consume_verification_token`
- `issue_password_reset_token` / `mark_password_reset_sent` / `password_reset_token_active` / `consume_password_reset`

`register_credentials_user` lowercases the email, inserts a credentials user and the first verification token in one transaction, and returns null when that email already exists, including a unique-violation race. A token failure rolls the new user back. Each other call is one transaction and only changes that user's rows. There is no scheduled cleanup. Issuing or consuming a link deletes that user's other token rows. Consuming a reset deletes that user's reset rows; it does not mark them used. `EXECUTE` is granted only to `service_role`. `issue_password_reset_token` returns `issued`, `cooldown`, or `busy`. `sent_at` is set only by `mark_password_reset_sent` after Resend accepts the email. A credentials user gets `{ ok: true }` only for `cooldown` (a row with `sent_at` inside 5 minutes) or for `issued` plus a successful mark. `busy` means an unsent row is younger than the 120-second lease: the route returns 500 and does not delete that row. A failed send deletes the new row and returns 500. If that delete fails, the next request is `busy` (500), not success, until the lease expires and a new link can be issued. Do not treat an unsent row as cooldown, do not set `sent_at` before the email is accepted, and do not return 200 when the mark matches zero rows. `forgot-password` and `resend-verification` return 500 when the lookup, save, or send fails. `register` returns `{ ok: true }` on a send failure and does not delete the user. Awaiting the reset email means a request for a real credentials account takes longer than a request for an unknown email; that timing difference is accepted so the user is not told to check an empty inbox. On an existing database, run the auth-token block in `supabase/schema.sql` before deploying the routes. That block deletes reset rows that were only marked used, then drops `used_at` and `email_sent`, drops the non-unique `users_email_idx`, enables row-level security on both token tables, ensures the verification `token_hash` index, and creates a unique index on `users.email`. It stops if two users share an email.

---

## Fonts

- Headings: `class="font-heading"` → Comfortaa
- Body: Source Serif Pro, Noto Serif (default)
- Accent: `class="font-display"` → Titan One
