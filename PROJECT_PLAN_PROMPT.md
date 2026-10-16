# MASTER DEVELOPMENT PLAN

Modern Educational Platform — Mathe Paidi Mou Archaia

Educational platform for Greek students.

---

# 1. TECH STACK (FIXED)

- Nuxt 4
- Vue 3 (Composition API + `<script setup>`)
- Tailwind CSS v4, shadcn-vue
- GSAP 3 + ScrollTrigger
- Auth.js (Credentials + Google)
- Supabase (PostgreSQL + Storage)
- Stripe (Checkout + Webhooks)
- PDF.js
- Resend (contact, verification, password reset)
- Vercel
- Custom `useI18n()` composable (en/el)
- oh-vue-icons, vue-sonner

No other stack additions allowed.

---

# 2. APPLICATION OVERVIEW

- Educator uploads structured content (grades → subjects → chapters → lessons; categories for standalone content)
- Content can be FREE or PAID (per-lesson Stripe purchase)
- Students browse by Grade → Subject → Chapter → Lesson, or by Category
- PDFs and images stored in Supabase Storage
- Custom admin panel inside the app
- Bilingual: Greek (el) and English (en) via `app/locales/`

---

# 3. ROUTING

**Public:**

- `/` — Home (sections: welcome, info, grades, instructions, more, communication)
- `/grade/[grade]` — Grade page
- `/grade/[grade]/[subject]` — Subject page
- `/chapter/[chapterId]` — Chapter page
- `/lesson/[lessonId]` — Lesson page
- `/category/[categoryId]` — Category page
- `/notes` — Notes landing
- `/about` — About
- `/login`, `/register` — Auth (modal or page)
- `/reset-password` — Password reset

**Authenticated:**

- `/dashboard` — User’s purchased content
- `/profile`, `/profile/edit` — Profile and edit

**Admin (admin middleware):**

- `/admin` — Overview (stats, quick actions)
- `/admin/grades`, `/admin/subjects`, `/admin/chapters`, `/admin/categories`, `/admin/lessons`
- `/admin/users`, `/admin/purchases`
- `/admin/uploads` — PDF/image upload to Supabase Storage

---

# 4. DATABASE (SUPABASE)

**Tables:**

- `users` — id, email, name, avatar_url, "isAdmin", email_verified, password_hash, provider, created_at
- `verification_tokens`, `password_reset_tokens` — Auth flows
- `grades` — id, name, order
- `subjects` — id, name, grade_id, image_url, order
- `categories` — id, name, description, image_url, order
- `chapters` — id, title, description, grade_id, subject_id, image_url, order, created_at
- `lessons` — id, chapter_id, subject_id, category_id, title, content, is_free, price, content_url, order, created_at (exactly one parent)
- `purchases` — id, user_id, lesson_id, stripe_session_id, created_at
- `downloads` — id, user_id, lesson_id, downloaded_at

**RLS:** Public read for grades, subjects, categories, chapters, lessons. Own-row for users, purchases, downloads. Admin writes via service role.

---

# 5. CONTENT MODEL

- **Lessons** are the content atom. Each lesson belongs to exactly one parent: chapter, subject, or category.
- **Chapters** belong to a grade and subject.
- **Categories** are standalone groupings (e.g. “Free Notes”).
- **Subjects** belong to a grade.

---

# 6. AUTH & ACCESS

- Auth.js: Credentials + Google
- Roles: admin, student (via `users."isAdmin"`)
- Middleware: `auth`, `admin`, `guest-only`
- Access: `canAccessLesson(userId, lessonId)` / `canAccessCourse` in `server/utils/access.ts`
- Paid content: check `purchases` table; Stripe Checkout + webhook for purchases

---

# 7. ADMIN FEATURES

- CRUD: grades, subjects, chapters, categories, lessons
- Reorder: grades, subjects, chapters, categories, lessons (save order)
- Upload PDFs/images to Supabase Storage via `/api/admin/upload`
- Attach content to lessons (content_url)
- View purchases, grant manual access
- View users, toggle admin, view user details (downloads, purchases)
- Stats: users, content, downloads, revenue, free vs paid, lessons by grade, recent activity

---

# 8. SEARCH

- Header search bar
- `/api/search` — Supabase query on chapters and lessons by title
- Debounced, live dropdown results

---

# 9. PDF VIEWER

- PDF.js (client-only)
- Load only if lesson is free or user has purchase
- `LessonContentViewer` supports PDF and images; fallback for unsupported formats

---

# 10. ANIMATIONS

- GSAP: `useGsapReveal()` — section reveals, stagger, hero, badge, parallax
- `import.meta.client` guards for DOM access

---

# 11. i18n & THEME

- `useI18n()` — `t(key)`, `locale`, `setLocale('el'|'en')`
- Locales: `app/locales/en.json`, `app/locales/el.json`
- Theme: `useTheme()` — light/dark via class on `<html>`

---

# 12. SECURITY

- Stripe secrets server-side only
- Webhooks verified
- RLS on Supabase
- Paid content validated server-side
- Rate limiting on contact, forgot-password, register, resend-verification

---

# 13. DEPLOYMENT

- Vercel
- Env: Supabase, Stripe, Resend, Auth.js secrets, Stripe webhook URL

---

# 14. DESIGN PRINCIPLES

- Clean, structured, modern, educational
- Minimal dependencies
- No hardcoded user-facing strings — use `t('key')`
- No emojis — use oh-vue-icons and animations
