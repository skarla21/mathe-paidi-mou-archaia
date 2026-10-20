// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_TITLE } from "./shared/utils/siteMeta.mjs";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  srcDir: "app",
  app: {
    head: {
      htmlAttrs: { lang: "el" },
      title: SITE_TITLE,
      meta: [
        { name: "description", content: SITE_DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "el_GR" },
        { property: "og:site_name", content: SITE_NAME },
        { property: "og:image", content: SITE_OG_IMAGE },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "1200" },
        { property: "og:image:alt", content: SITE_NAME },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:image", content: SITE_OG_IMAGE },
      ],
    },
  },
  css: [resolve(__dirname, "app/assets/css/main.css")],
  modules: ["@nuxt/eslint"],
  typescript: {
    // Nuxt already hoists vue and @vue/runtime-core. These two have to
    // follow, or runtime-dom's DOM ref bailout lands on a second
    // @vue/reactivity and ref() deep-unwraps HTMLElement.
    hoist: ["@vue/reactivity", "@vue/runtime-dom"],
  },
  vite: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [tailwindcss()] as any,
    optimizeDeps: {
      include: [
        "@vue/devtools-core",
        "@vue/devtools-kit",
        "oh-vue-icons",
        "oh-vue-icons/icons/bi",
        "vue-sonner",
        "gsap",
        "gsap/ScrollTrigger",
        "class-variance-authority",
        "clsx",
        "tailwind-merge",
      ],
    },
  },
  routeRules: {
    '/notes': { redirect: '/#categories' },
    '/login': { redirect: '/?auth=login' },
    '/register': { redirect: '/?auth=register' },
    '/profile': { redirect: '/' },
    '/profile/**': { redirect: '/' },
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  },
  hooks: {
    // Barrel files such as ui/checkbox/index.ts resolve to the same
    // auto-import name as Checkbox.vue. They stay importable.
    "components:dirs"(dirs) {
      for (const dir of dirs) {
        if (typeof dir === "string") continue;
        dir.ignore = [...(dir.ignore ?? []), "**/index.ts"];
      }
    },
  },
  nitro: {
    experimental: {
      openAPI: false,
    },
  },
  alias: {
    cookie: resolve(__dirname, "node_modules/cookie"),
  },
  runtimeConfig: {
    public: {
      supabaseUrl: "",
      supabaseAnonKey: "",
      recaptchaSiteKey: "",
    },
    supabaseServiceKey: "",
    stripeSecretKey: "",
    stripeWebhookSecret: "",
    authSecret: "",
    googleClientId: "",
    googleClientSecret: "",
    resendApiKey: "",
    recaptchaSecretKey: "",
    contactEmail: "antwnis_skarlatos@yahoo.com",
  },
});
