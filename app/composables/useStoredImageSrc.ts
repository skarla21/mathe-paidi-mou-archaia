import { acceptedEntityImageUrl } from '#shared/utils/entityImageUrl.mjs'

export function useStoredImageSrc() {
  const supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || '')
  return (url: string | null | undefined) => {
    const accepted = acceptedEntityImageUrl(url ?? '', supabaseUrl)
    return typeof accepted === 'string' ? accepted : ''
  }
}
