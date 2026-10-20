import { canonicalHref } from "#shared/utils/siteMeta.mjs"

const DESCRIPTION_MAX = 160

export const ROBOTS_NOINDEX_NOFOLLOW = { name: "robots", content: "noindex, nofollow" }
export const ROBOTS_NOINDEX_FOLLOW = { name: "robots", content: "noindex, follow" }

type SocialTag = {
  tag?: string
  textContent?: unknown
  props?: Record<string, unknown>
}

type SocialContext = {
  tagMap: Map<string, SocialTag>
  tags: SocialTag[]
}

function clip(text: string) {
  if (text.length <= DESCRIPTION_MAX) return text
  const window = text.slice(0, DESCRIPTION_MAX + 1)
  const space = window.lastIndexOf(" ")
  const cut =
    space > Math.floor(DESCRIPTION_MAX * 0.6)
      ? window.slice(0, space)
      : text.slice(0, DESCRIPTION_MAX)
  return `${cut.trimEnd()}…`
}

export function describedHead(
  title: string,
  description?: string | null,
  extraMeta: Array<Record<string, string>> = [],
  canonicalPath?: string | null,
) {
  const text = description?.replace(/\s+/g, " ").trim() ?? ""
  const content = text ? clip(text) : ""
  const href = canonicalPath?.trim() ? canonicalHref(canonicalPath) : ""
  return {
    title,
    meta: [
      ...(content ? [{ name: "description", content }] : []),
      ...(href ? [{ property: "og:url", content: href }] : []),
      ...extraMeta,
    ],
    ...(href ? { link: [{ rel: "canonical", href }] } : {}),
  }
}

function setMeta(
  ctx: SocialContext,
  key: string,
  attr: "name" | "property",
  name: string,
  content: string,
) {
  const existing = ctx.tagMap.get(key)
  if (existing) {
    existing.props = { ...existing.props, content }
    return
  }
  const tag: SocialTag = { tag: "meta", props: { [attr]: name, content } }
  ctx.tagMap.set(key, tag)
  ctx.tags.push(tag)
}

export function applySocialMeta(ctx: SocialContext) {
  const titleText = ctx.tagMap.get("title")?.textContent
  const title = typeof titleText === "string" ? titleText.trim() : ""
  if (title) {
    setMeta(ctx, "meta:og:title", "property", "og:title", title)
    setMeta(ctx, "meta:twitter:title", "name", "twitter:title", title)
  }

  const rawDescription = ctx.tagMap.get("meta:description")?.props?.content
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() : ""
  if (description) {
    setMeta(ctx, "meta:og:description", "property", "og:description", description)
    setMeta(
      ctx,
      "meta:twitter:description",
      "name",
      "twitter:description",
      description,
    )
  }

  setMeta(ctx, "meta:twitter:card", "name", "twitter:card", "summary")
}
