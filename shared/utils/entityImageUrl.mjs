const PUBLIC_PREFIX = '/storage/v1/object/public/uploads/'
const IMAGE_PREFIX = 'entity-images/'

export function classifyEntityImageUrl(url, supabaseUrl) {
  if (!url || !supabaseUrl) return { kind: 'ignore' }
  let parsed
  let base
  try {
    parsed = new URL(url)
    base = new URL(supabaseUrl)
  } catch {
    return { kind: 'ignore' }
  }
  if (parsed.origin !== base.origin) return { kind: 'ignore' }
  if (!parsed.pathname.startsWith(PUBLIC_PREFIX)) return { kind: 'block' }
  let path
  try {
    path = decodeURIComponent(parsed.pathname.slice(PUBLIC_PREFIX.length))
  } catch {
    return { kind: 'block' }
  }
  if (!path.startsWith(IMAGE_PREFIX) || path.includes('\\') || path.includes('..')) return { kind: 'block' }
  const parts = path.split('/')
  if (parts.length !== 2 || parts.some((part) => part === '' || part === '.' || part === '..')) {
    return { kind: 'block' }
  }
  return { kind: 'path', path }
}

function canonicalEntityImageUrl(path, supabaseUrl) {
  const origin = new URL(supabaseUrl).origin
  const encoded = path.split('/').map((part) => encodeURIComponent(part)).join('/')
  return `${origin}${PUBLIC_PREFIX}${encoded}`
}

export function acceptedEntityImageUrl(url, supabaseUrl) {
  const value = typeof url === 'string' ? url.trim() : ''
  if (!value) return null
  const classified = classifyEntityImageUrl(value, supabaseUrl)
  if (classified.kind !== 'path') return false
  return canonicalEntityImageUrl(classified.path, supabaseUrl)
}

export function entityImageDraft(url, supabaseUrl) {
  const accepted = acceptedEntityImageUrl(url, supabaseUrl)
  if (typeof accepted === 'string') return { draft: accepted, preserveExisting: false }
  if (accepted === false) return { draft: '', preserveExisting: true }
  return { draft: '', preserveExisting: false }
}

export function borrowEntityImage({ chosen, sessionUrl, supabaseUrl } = {}) {
  const accepted = acceptedEntityImageUrl(chosen, supabaseUrl)
  if (typeof accepted !== 'string') return null
  const previous = typeof sessionUrl === 'string' ? sessionUrl : ''
  return {
    imageUrl: accepted,
    sessionUrl: '',
    imageRemoved: false,
    preserveExisting: false,
    discardUrl: previous && previous !== accepted ? previous : '',
  }
}

export function entityImageSaveFields({
  creating = false,
  draft = '',
  preserveExisting = false,
  removed = false,
} = {}) {
  if (removed) return { image_url: null }
  if (draft) return { image_url: draft }
  if (!creating && preserveExisting) return {}
  return { image_url: null }
}
