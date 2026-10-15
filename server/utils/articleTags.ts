import { normalizeContentTags } from './contentTags'

/** Article admin routes — same rules as normalizeContentTags. */
export function normalizeArticleTags(input: unknown): string[] {
  return normalizeContentTags(input)
}
