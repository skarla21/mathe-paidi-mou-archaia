## Local Development Setup

This file describes how to run the app locally in **dev** and what you must configure in Supabase, Stripe, and env vars.

---

### 1. Install dependencies

From the project root:

```bash
pnpm install
```

This installs Nuxt, Tailwind, GSAP, Supabase client, Stripe SDK, PDF.js, `oh-vue-icons`, etc.

---

### 2. Environment variables

1. Create your local env file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill the following:

   - **Supabase**
     - `NUXT_PUBLIC_SUPABASE_URL` – your Supabase project URL (e.g. `https://xyzcompany.supabase.co`).
     - `NUXT_PUBLIC_SUPABASE_ANON_KEY` – the **anon public** key.
     - `NUXT_SUPABASE_SERVICE_KEY` – the **service_role** key (server‑only, keep it secret).

   - **Stripe**
     - `NUXT_STRIPE_SECRET_KEY` – your Stripe **test** secret key.
     - `NUXT_STRIPE_WEBHOOK_SECRET` – signing secret for the `checkout.session.completed` webhook (see Stripe section).

   - **Auth**
     - `NUXT_AUTH_SECRET` – the only env var required for the current Auth.js setup. It is used to sign JWTs and must be a long, random string. **How to acquire it:** generate one, e.g.:
       - Terminal: `openssl rand -base64 32`
       - Or Node: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
       - Use the output as the value (no quotes needed in `.env`).

   - **Resend** (contact form, future verification/password reset)
     - `NUXT_RESEND_API_KEY` or `RESEND_API_KEY` – your Resend API key (Sending Access permission is sufficient).
     - `NUXT_CONTACT_EMAIL` – optional; email where contact form messages are sent (defaults to `antwnis_skarlatos@yahoo.com`).

Nuxt reads these via `runtimeConfig` in `nuxt.config.ts`.

---

### 3. Supabase setup

#### 3.1 Create tables and RLS

1. Open Supabase → **SQL Editor**.
2. Open `supabase/schema.sql` from this repo.
3. Copy–paste the entire file into the SQL editor and run it **once**.

This creates:

- Tables: `users`, `grades`, `subjects`, `chapters`, `categories`, `lessons`, `purchases`, `downloads`.
- Foreign keys and useful indexes.
- Row-Level Security policies (RLS) so:
  - Public data can be read anonymously.
  - User‑specific data (like `purchases`) is only visible to that user.

#### 3.2 Storage bucket for PDFs

1. Supabase → **Storage** → “Create new bucket”.
2. Name it `uploads` (this matches `server/api/admin/upload.post.ts`).
3. Keep it **private** for now; the app uses signed/public URLs and server checks to control access.

If you change the bucket name, update `admin/upload.post.ts` accordingly.

#### 3.3 Seed minimal data

To see real content on the first run, insert a minimal set of rows in Supabase (via SQL editor or the table UI):

- One `grade` (e.g. “Grade 1”).
- One `subject` pointing to that grade.
- One `chapter` pointing to that grade + subject.
- One `lesson` for that chapter (`is_free = true` recommended initially).

With this, the following routes will show real data:

- `/` (Grades cards)
- `/grade/[grade-id]`
- `/grade/[grade-id]/[subject-id]`
- `/chapter/[chapter-id]`
- `/lesson/[lesson-id]`

---

### 4. Stripe setup (test mode)

You only need Stripe for **paid** lessons (`is_free = false`).

#### 4.1 Basic configuration

1. In Stripe dashboard, switch to **Test mode**.
2. Copy the **test secret key** and set:

   ```env
   NUXT_STRIPE_SECRET_KEY=sk_test_...
   ```

3. Ensure that in Supabase:
   - For a paid lesson, `is_free = false`.
   - `price` is set in **cents** (e.g. `1500` = €15.00).

#### 4.2 Webhook

To have Stripe create a `purchases` record after payment:

1. In Stripe dashboard → **Developers → Webhooks**:
   - Create an endpoint pointing to:
     - For local dev via Stripe CLI forwarding: `https://localhost:3000/api/stripe/webhook`
       (you will actually forward to this from the CLI).
     - For production (on Vercel): `https://your-domain.com/api/stripe/webhook`.
   - Select event: `checkout.session.completed`.

2. Copy the **signing secret** for that endpoint and set:

   ```env
   NUXT_STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. (Optional, but recommended in dev) Use **Stripe CLI**:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Then copy the secret from the CLI output into `NUXT_STRIPE_WEBHOOK_SECRET`.

After this:

- `POST /api/stripe/checkout` will create a Checkout Session.
- The webhook handler `server/api/stripe/webhook.post.ts` will insert into `purchases` on `checkout.session.completed`.

---

### 5. Auth (Auth.js)

Auth is implemented with **Auth.js** (`@auth/core`): JWT sessions, Credentials provider (email/password with hashing in Supabase `users` table), and Google OAuth. Authorization is based on a simple boolean flag (`"isAdmin"` column) rather than roles.

- **Env:**
  - `NUXT_AUTH_SECRET` – used to sign JWTs (see section 2).
  - `NUXT_GOOGLE_CLIENT_ID` / `NUXT_GOOGLE_CLIENT_SECRET` – credentials for Google OAuth.
- **Database (`users` table):**
  - `id uuid primary key default gen_random_uuid()`
  - `email text`
  - `"isAdmin" boolean not null default false` – set to `true` manually in Supabase for admin users.
  - `password_hash text` – stores a bcrypt hash of the password (never plain text).
- **Endpoints:** `/api/auth/*` is handled by `server/api/auth/[...].ts`. Session is exposed at `GET /api/auth/session` (returns `{ user, session }` or `{ user: null, session: null }`).
- **Verification and password reset:** rows in `verification_tokens` and `password_reset_tokens` are written only by the SQL functions in `supabase/schema.sql` (`register_credentials_user`, `issue_verification_token`, `consume_verification_token`, `issue_password_reset_token(user, hash, expires, cooldown seconds, lease seconds)`, `mark_password_reset_sent`, `password_reset_token_active`, `consume_password_reset`). Routes never insert token rows. They delete only the row they just created when the email send fails (`forgot-password`, `resend-verification`, and `register`). `register_credentials_user` lowercases the email and creates a credentials user and the first verification token in one transaction; a token failure rolls the new user back, and a duplicate email, including a unique-violation race, returns null. `issue_password_reset_token(user, hash, expires, cooldown seconds, lease seconds)` returns `issued`, `cooldown`, or `busy`. `sent_at` stays null until `mark_password_reset_sent` runs after Resend accepts the message. The route returns success only for `cooldown` or for `issued` when that mark returns true. `busy` (an unsent row younger than the 120-second lease) is a 500 and does not delete the in-flight row. A failed send deletes the new row and returns 500; if that delete also fails, the next request stays `busy` until the lease expires, then a new link can be issued. Do not treat an unsent row as cooldown, and do not return success when the mark matches zero rows. `forgot-password` and `resend-verification` return 500 when the lookup, save, or send fails. `register` returns `{ ok: true }` on a send failure and does not delete the user. Awaiting the reset email means a request for a real credentials account takes longer than a request for an unknown email; that timing difference is accepted so the user is not told to check an empty inbox. A full schema run creates them. On an existing database, run that whole auth-token block in the SQL editor before deploying the routes. The block deletes reset rows that were only marked used, then drops `used_at` and `email_sent`, drops the non-unique `users_email_idx`, enables row-level security on both token tables, ensures the verification `token_hash` index, and creates a unique index on `users.email` after lowercasing emails. It stops if two users share an email. Only `service_role` can execute the functions. Both tables have row-level security enabled and no policies, so the Data API cannot read or write them. `verification_tokens` is indexed on `token_hash`.
- **Middleware:** `guest-only` redirects authenticated users away from login/register; `admin` redirects non-admins away from `/admin` (and sub-routes) using the `isAdmin` flag.
- **Pages:**
  - Login uses the Credentials flow (email + password) and offers a Google OAuth button.
  - Register calls `register_credentials_user` via `POST /api/auth/register` to create a user and verification token in one transaction.
  - For protected server routes that need the current user, call `getAuthOptions()` from `server/api/auth/[...].ts` and use Auth.js helpers, or call `GET /api/auth/session` and rely on the returned `user` (which includes `id`, `email`, and `isAdmin`).

---

### 6. Resend setup (contact form and transactional emails)

The contact form and auth emails (verification, password reset) use Resend.

1. Create an API key at [Resend Dashboard](https://resend.com/api-keys).
2. Use **Sending Access** permission (sufficient for sending emails).
3. Add to `.env`:
   - `NUXT_RESEND_API_KEY` – your Resend API key
   - `NUXT_CONTACT_EMAIL` – email where contact form messages are sent (optional; defaults to `antwnis_skarlatos@yahoo.com`)
   - `NUXT_PUBLIC_RECAPTCHA_SITE_KEY` – reCAPTCHA v2 checkbox site key (public; used in the browser)
   - `NUXT_RECAPTCHA_SECRET_KEY` – reCAPTCHA v2 secret key (server only; never use a `NUXT_PUBLIC_` name)

Create two key pairs at [google.com/recaptcha/admin/create](https://www.google.com/recaptcha/admin/create): type **Challenge (v2)** → **“I’m not a robot” Checkbox**. The production pair allows only `mathe-paidi-mou-archaia.com` and `www.mathe-paidi-mou-archaia.com`. Local development uses a separate key pair that allows `localhost`. Set the production pair in the Vercel project environment for Production. The server accepts `localhost` only when `NODE_ENV` is not `production`. The contact form refuses to send when the secret is missing.

When a user submits the contact form, the message is sent to `NUXT_CONTACT_EMAIL` with `replyTo` set to the submitter's email, so you can reply directly from your inbox.

**Free tier:** 100 emails/day, 3,000 emails/month. For production, verify a custom domain in Resend and set `from` in `server/utils/email.ts`.

---

### 7. Run the dev server

After configuring `.env` and Supabase:

```bash
pnpm dev
```

- The app will be available at `http://localhost:3000`.
- Key flows to test:
  - Home page:
    - Sections render correctly.
    - Notes dropdown shows your grades/subjects.
    - Search input calls `/api/search` and returns results when Supabase has data.
  - Grades/subjects:
    - `/grade/<grade-id>`
    - `/grade/<grade-id>/<subject-id>`
  - Chapter and lesson pages:
    - `/chapter/<chapter-id>`
    - `/lesson/<lesson-id>` including PDF viewer when `pdf_url` is set and access is allowed.
  - Admin:
    - `/admin` and sub‑routes read from Supabase (`grades`, `subjects`, `chapters`, `lessons`, `categories`, `purchases`).

If you see 500 errors during navigation:

- Check the terminal output from `pnpm dev` for stack traces.
- Most common causes:
  - Missing or wrong Supabase URL/keys.
  - Storage bucket `uploads` missing.
  - Stripe secrets not set when hitting checkout/webhook routes.

---

### 8. Production / Vercel (preview)

For a production‑like preview (after dev is stable):

1. Push this repo to GitHub.
2. Create a new project on **Vercel** and import the repo.
3. In Vercel “Environment Variables”, set the same values as in your local `.env`.
4. Vercel should auto‑detect Nuxt and run `pnpm build`.
5. After deploy, update your Stripe webhook to point to:

   ```text
   https://your-vercel-domain/api/stripe/webhook
   ```

You will still need to wire real Auth.js before going live with real students, but the rest of the stack will already be in place.

