import { applySocialMeta } from "~/utils/socialHead"

type SocialResolveContext = Parameters<typeof applySocialMeta>[0]

export default defineNuxtPlugin(() => {
  const head = injectHead()
  if (!head) return
  head.use({
    key: "social-meta",
    hooks: {
      "tags:beforeResolve"(ctx: SocialResolveContext) {
        applySocialMeta(ctx)
      },
    },
  })
})
