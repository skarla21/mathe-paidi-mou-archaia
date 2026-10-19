# Mathe-Paidi-Mou-Archaia

Modern educational platform (Nuxt 3, Vue 3, Tailwind, Supabase, Stripe, PDF.js).

## Stack

- **Framework:** Nuxt 3 / Nuxt 4, Vue 3 (Composition API, `<script setup>`)
- **Styling:** Tailwind CSS, shadcn-vue–style components (Radix Vue + CVA)
- **Animations:** GSAP
- **Backend:** Supabase (PostgreSQL + Storage)
- **Auth:** Auth.js (configure when using Nuxt 3; Nuxt 4–compatible module TBD). Session stub at `/api/auth/session`.
- **Payments:** Stripe Checkout + webhook
- **PDF:** PDF.js in lesson viewer
- **Contact:** Resend (contact form emails; set NUXT_CONTACT_EMAIL and NUXT_RESEND_API_KEY). reCAPTCHA v2 checkbox (`NUXT_PUBLIC_RECAPTCHA_SITE_KEY`, server-only `NUXT_RECAPTCHA_SECRET_KEY`; set both in Vercel Production too)
- **Deploy:** Vercel

## Setup

1. **Install**

   ```bash
   pnpm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set Supabase URL and keys (anon + service role)
   - Set Stripe secret and webhook secret
   - Set Auth secret when using Auth.js

3. **Database**
   - In Supabase SQL Editor, run `supabase/schema.sql` to create tables and RLS.

4. **Supabase Storage**
   - Create a bucket named `uploads` (or change `server/api/admin/upload.post.ts`) for PDF uploads.

5. **Run**
   ```bash
   pnpm dev
   ```

## Routes

- **Public:** `/`, `/grade/[grade]`, `/grade/[grade]/[subject]`, `/chapter/[id]`, `/lesson/[id]`, `/about`, `/login`, `/register`
- **Authenticated:** `/dashboard`
- **Admin:** `/admin`, `/admin/grades`, `/admin/subjects`, `/admin/chapters`, `/admin/lessons`, `/admin/categories`, `/admin/purchases`

Admin middleware is a placeholder (allows all). Wire Auth.js and set `event.context.auth` (e.g. `userId`, `role`) in server middleware so `/admin/*` and Stripe checkout require an admin or logged-in user.

## Stripe

- Checkout: `POST /api/stripe/checkout` with body `{ lessonId }`. Requires auth context with `userId`.
- Webhook: `POST /api/stripe/webhook`. Set `STRIPE_WEBHOOK_SECRET` and point Stripe to this URL.

## i18n & theme

- The interface is Greek only. There is no language toggle.
- Theme: `useTheme().toggle()` and `init()` in layout; light/dark stored in localStorage.

## Deploy (Vercel)

- Connect repo; Vercel detects Nuxt.
- Set env vars (Supabase, Stripe, Auth).
- Configure Stripe webhook to `https://your-domain.com/api/stripe/webhook`.
